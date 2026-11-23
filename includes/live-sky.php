<?php
/**
 * Yesterday's clouds, snow and sea ice for the satellite globe, from NASA's daily imagery (GIBS).
 *
 * Once a day the server downloads three world images from NASA, turns them into two greyscale masks
 * (clouds, and snow with sea ice) the size of the bundled clouds image, and keeps the newest pair in
 * uploads/wor-sky. If anything fails, the globe keeps the bundled clouds and shows no snow.
 *
 * @package World_On_Rotation
 */

defined( 'ABSPATH' ) || exit;

const WOR_SKY_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

/** Layer names to try, in order: the first one NASA lists is used. */
function wor_sky_layers() {
	return array(
		'colour' => array( 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', 'VIIRS_SNPP_CorrectedReflectance_TrueColor', 'VIIRS_NOAA21_CorrectedReflectance_TrueColor', 'MODIS_Terra_CorrectedReflectance_TrueColor', 'MODIS_Aqua_CorrectedReflectance_TrueColor' ),
		'snow'   => array( 'MODIS_Terra_NDSI_Snow_Cover', 'MODIS_Aqua_NDSI_Snow_Cover', 'VIIRS_SNPP_NDSI_Snow_Cover', 'VIIRS_NOAA20_NDSI_Snow_Cover' ),
		'ice'    => array( 'AMSR2_Sea_Ice_Concentration_12km', 'AMSRU2_Sea_Ice_Concentration_12km', 'MODIS_Terra_Sea_Ice', 'MODIS_Aqua_Sea_Ice' ),
	);
}

/** Pick the layers NASA currently publishes (checked once a week). */
function wor_sky_pick_layers() {
	$cached = get_transient( 'wor_sky_layers' );
	if ( is_array( $cached ) ) {
		return $cached;
	}
	$res  = wp_remote_get( WOR_SKY_WMS . '?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.1.1', array( 'timeout' => 60 ) );
	$caps = is_wp_error( $res ) ? '' : (string) wp_remote_retrieve_body( $res );
	$pick = array();
	foreach ( wor_sky_layers() as $kind => $names ) {
		$pick[ $kind ] = '';
		foreach ( $names as $n ) {
			if ( '' === $caps || false !== strpos( $caps, '<Name>' . $n . '</Name>' ) ) {
				$pick[ $kind ] = $n;
				break;
			}
		}
	}
	set_transient( 'wor_sky_layers', $pick, '' === $caps ? HOUR_IN_SECONDS : WEEK_IN_SECONDS );
	return $pick;
}

/** One world image for a layer and day, as a GD image, or null. */
function wor_sky_fetch( $layer, $date, $png ) {
	if ( '' === $layer ) {
		return null;
	}
	$url = add_query_arg(
		array(
			'SERVICE'     => 'WMS',
			'REQUEST'     => 'GetMap',
			'VERSION'     => '1.1.1',
			'LAYERS'      => $layer,
			'SRS'         => 'EPSG:4326',
			'BBOX'        => '-180,-90,180,90',
			'WIDTH'       => 2048,
			'HEIGHT'      => 1024,
			'FORMAT'      => $png ? 'image/png' : 'image/jpeg',
			'TRANSPARENT' => $png ? 'TRUE' : 'FALSE',
			'TIME'        => $date,
		),
		WOR_SKY_WMS
	);
	$res = wp_remote_get( $url, array( 'timeout' => 90 ) );
	if ( is_wp_error( $res ) || 200 !== (int) wp_remote_retrieve_response_code( $res ) ) {
		return null;
	}
	$type = (string) wp_remote_retrieve_header( $res, 'content-type' );
	if ( false === strpos( $type, 'image' ) ) {
		return null; // NASA answers errors as XML
	}
	$im = @imagecreatefromstring( wp_remote_retrieve_body( $res ) ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
	return $im ? $im : null;
}

/** Share of pixels in an image that carry data (not transparent, not black), from a sample. */
function wor_sky_coverage( $im ) {
	$w = imagesx( $im );
	$h = imagesy( $im );
	$n = 0;
	$t = 0;
	for ( $y = 4; $y < $h; $y += 16 ) {
		for ( $x = 4; $x < $w; $x += 16 ) {
			$c = imagecolorat( $im, $x, $y );
			$a = ( $c >> 24 ) & 0x7F;
			$l = ( ( $c >> 16 ) & 255 ) + ( ( $c >> 8 ) & 255 ) + ( $c & 255 );
			++$t;
			if ( $a < 100 && $l > 30 ) {
				++$n;
			}
		}
	}
	return $t ? $n / $t : 0;
}

/** Build and save today's masks. Returns true when the clouds were updated. */
function wor_sky_update() {
	if ( ! function_exists( 'imagecreatefromstring' ) ) {
		return false;
	}
	@set_time_limit( 300 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
	if ( function_exists( 'wp_raise_memory_limit' ) ) {
		wp_raise_memory_limit( 'image' );
	}
	$layers = wor_sky_pick_layers();

	// True colour: the most recent complete day. Snow and ice can lag a day or two.
	$colour = null;
	$day    = '';
	for ( $back = 1; $back <= 3 && ! $colour; $back++ ) {
		$d  = gmdate( 'Y-m-d', time() - $back * DAY_IN_SECONDS );
		$im = wor_sky_fetch( $layers['colour'], $d, false );
		if ( $im && wor_sky_coverage( $im ) > 0.4 ) {
			$colour = $im;
			$day    = $d;
		} elseif ( $im ) {
			imagedestroy( $im );
		}
	}
	if ( ! $colour ) {
		return false;
	}
	$snow = null;
	$ice  = null;
	for ( $back = 1; $back <= 4 && ( ! $snow || ! $ice ); $back++ ) {
		$d = gmdate( 'Y-m-d', time() - $back * DAY_IN_SECONDS );
		if ( ! $snow ) {
			$im = wor_sky_fetch( $layers['snow'], $d, true );
			if ( $im && wor_sky_coverage( $im ) > 0.01 ) {
				$snow = $im;
			} elseif ( $im ) {
				imagedestroy( $im );
			}
		}
		if ( ! $ice ) {
			$im = wor_sky_fetch( $layers['ice'], $d, true );
			if ( $im && wor_sky_coverage( $im ) > 0.005 ) {
				$ice = $im;
			} elseif ( $im ) {
				imagedestroy( $im );
			}
		}
	}

	$w  = imagesx( $colour );
	$h  = imagesy( $colour );
	$cm = imagecreatetruecolor( $w, $h );
	$sm = imagecreatetruecolor( $w, $h );
	$grey = array();
	for ( $i = 0; $i < 256; $i++ ) {
		$grey[ $i ] = ( $i << 16 ) | ( $i << 8 ) | $i;
	}
	for ( $y = 0; $y < $h; $y++ ) {
		for ( $x = 0; $x < $w; $x++ ) {
			// Snow and sea ice: wherever those layers carry data.
			$s = 0;
			foreach ( array( $snow, $ice ) as $m ) {
				if ( ! $m ) {
					continue;
				}
				$c = imagecolorat( $m, $x, $y );
				$a = 127 - ( ( $c >> 24 ) & 0x7F );
				$l = max( ( $c >> 16 ) & 255, ( $c >> 8 ) & 255, $c & 255 );
				if ( $a > 40 && $l > 40 ) {
					$s = max( $s, min( 255, $a * 2 ) );
				}
			}
			// Clouds: bright and grey in the true-colour image, but not where the ground is snow or ice.
			$c   = imagecolorat( $colour, $x, $y );
			$r   = ( $c >> 16 ) & 255;
			$g   = ( $c >> 8 ) & 255;
			$b   = $c & 255;
			$l   = ( $r + $g + $b ) / 3;
			$sat = max( $r, $g, $b ) - min( $r, $g, $b );
			$k   = max( 0, min( 1, ( $l - 95 ) / 110 ) ) * max( 0, min( 1, 1 - ( $sat - 18 ) / 50 ) );
			if ( $s > 0 ) {
				$k *= 0.35;
			}
			imagesetpixel( $cm, $x, $y, $grey[ (int) round( $k * 255 ) ] );
			imagesetpixel( $sm, $x, $y, $grey[ $s ] );
		}
	}
	imagedestroy( $colour );
	if ( $snow ) {
		imagedestroy( $snow );
	}
	if ( $ice ) {
		imagedestroy( $ice );
	}

	$up  = wp_upload_dir();
	$dir = trailingslashit( $up['basedir'] ) . 'wor-sky';
	if ( ! wp_mkdir_p( $dir ) ) {
		return false;
	}
	$stamp = str_replace( '-', '', $day );
	$cf    = "clouds-$stamp.jpg";
	$sf    = "snow-$stamp.jpg";
	imagefilter( $sm, IMG_FILTER_GAUSSIAN_BLUR );   // soft snow edges
	imagefilter( $sm, IMG_FILTER_GAUSSIAN_BLUR );
	$ok    = imagejpeg( $cm, "$dir/$cf", 82 ) && imagejpeg( $sm, "$dir/$sf", 82 );
	imagedestroy( $cm );
	imagedestroy( $sm );
	if ( ! $ok ) {
		return false;
	}
	foreach ( (array) glob( "$dir/*.jpg" ) as $old ) {
		if ( basename( $old ) !== $cf && basename( $old ) !== $sf ) {
			@unlink( $old ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		}
	}
	$base = trailingslashit( $up['baseurl'] ) . 'wor-sky/';
	update_option(
		'wor_sky',
		array(
			'day'    => $day,
			'clouds' => $base . $cf,
			'snow'   => ( $snow || $ice ) ? $base . $sf : '',
		),
		false
	);
	if ( function_exists( 'wor_purge_caches' ) ) {
		wor_purge_caches();
	}
	return true;
}

/** What the globe needs: the current mask addresses, or an empty array. */
function wor_sky_data() {
	$s = get_option( 'wor_sky' );
	return is_array( $s ) && ! empty( $s['clouds'] ) ? $s : array();
}

// Run once a day, at around 06:00 UTC when the previous day's imagery is complete.
add_action( 'wor_sky_daily', 'wor_sky_update' );
add_action(
	'init',
	function () {
		if ( ! wp_next_scheduled( 'wor_sky_daily' ) ) {
			$first = strtotime( 'tomorrow 06:10 UTC' );
			wp_schedule_event( $first, 'daily', 'wor_sky_daily' );
			wp_schedule_single_event( time() + 60, 'wor_sky_daily' ); // and once straight away
		}
	}
);
