<?php
/**
 * The globe. A full-screen page with its own assets; its content comes from the World on Rotation plugin.
 */

$wort_uri = get_template_directory_uri();
$wort_dir = get_template_directory();
$wort_ver = WORT_VERSION;

$wort_data = function_exists( 'wor_globe_data' ) ? wor_globe_data() : array(
	'playlists' => array(),
	'selectors' => (object) array(),
	'places'    => (object) array(),
	'countries' => (object) array(),
	'links'     => (object) array(),
);
$wort_slugs = array( 'places' => array(), 'countries' => array() );
if ( function_exists( 'wor_data' ) ) {
	$wort_d = wor_data();
	foreach ( $wort_d['CITY'] as $wort_name => $wort_c ) {
		$wort_slugs['places'][ $wort_name ] = $wort_c['slug'];
	}
	foreach ( $wort_d['CGUIDE'] as $wort_name => $wort_g ) {
		$wort_slugs['countries'][ $wort_name ] = $wort_g['slug'];
	}
}
$wort_data['slugs'] = array( 'places' => (object) $wort_slugs['places'], 'countries' => (object) $wort_slugs['countries'] );
$wort_data['img']   = $wort_uri . '/assets/img/';
$wort_data['v']     = $wort_ver;
$wort_data['t']     = wort_t_all();

// Design preview for editors: ?design=passport switches it on (remembered for 30 days), ?design=current switches it off.
$wort_design = '';
if ( current_user_can( 'edit_posts' ) ) {
	if ( isset( $_GET['design'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		$wort_design = 'passport' === $_GET['design'] ? 'passport' : ''; // phpcs:ignore WordPress.Security.NonceVerification
		setcookie( 'wor_design', $wort_design, $wort_design ? time() + 30 * DAY_IN_SECONDS : time() - 3600, COOKIEPATH ? COOKIEPATH : '/', COOKIE_DOMAIN, is_ssl(), true );
	} elseif ( isset( $_COOKIE['wor_design'] ) && 'passport' === $_COOKIE['wor_design'] ) {
		$wort_design = 'passport';
	}
}
$wort_globe = $wort_design ? 'globe-passport' : 'globe';
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base href="<?php echo esc_url( home_url( '/' ) ); ?>">
<meta name="description" content="<?php echo esc_attr( wort_t( 'share_text' ) ); ?>">
<meta property="og:title" content="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
<meta property="og:description" content="<?php echo esc_attr( wort_t( 'share_text' ) ); ?>">
<meta name="theme-color" content="#070c14">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..700,0..100&amp;family=Londrina+Solid:wght@400;900&amp;family=Special+Elite&amp;family=Instrument+Sans:wght@400..600&amp;family=IBM+Plex+Mono:wght@400;500;600&amp;family=Barlow+Condensed:wght@500;600&amp;display=swap">
<link rel="stylesheet" href="<?php echo esc_url( $wort_uri . '/assets/' . $wort_globe . '.css?ver=' . $wort_ver ); ?>">
<?php wp_head(); ?>
</head>
<body <?php body_class( 'wort-globe' ); ?>>
<?php wp_body_open(); ?>
<?php
// The globe markup is static HTML from the theme folder.
$wort_markup = file_get_contents( $wort_dir . '/parts/globe-markup.html' );
// Text from Settings → General and Appearance → Customize → World on Rotation replaces the defaults.
$wort_e = function ( $k ) {
	return esc_html( wort_t( $k ) );
};
echo strtr( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$wort_markup,
	array(
		'<h1>World on Rotation</h1>'                                   => '<h1>' . wort_brand_name_html() . '</h1>',
		'World on Rotation'                                            => esc_html( get_bloginfo( 'name' ) ),
		'Your Rhythm Passport to everywhere'                           => esc_html( get_bloginfo( 'description' ) ),
		'Music... It Means the World To Us!'                           => esc_html( wort_motto() ),
		'placeholder="Search a place, country, mix, playlist or selector"' => 'placeholder="' . esc_attr( wort_t( 'search' ) ) . '"',
		'Your passport · <b'                                           => $wort_e( 'passport' ) . ' · <b',
		'◉ Play something random'                                      => $wort_e( 'random' ),
		'>Drag to spin · scroll to zoom · tap a country<'              => '>' . $wort_e( 'hint_bottom' ) . '<',
		'>Tap a pin or a country<'                                     => '>' . $wort_e( 'hint_center' ) . '<',
		'<p>A random mix from your side of the world, playing now</p>' => '<p>' . $wort_e( 'intro_line' ) . '</p>',
		'>Open the globe<'                                             => '>' . $wort_e( 'intro_button' ) . '<',
		"If it doesn't start by itself, press play."                   => $wort_e( 'player_note' ),
		'>Places<'                                                     => '>' . $wort_e( 'nav_places' ) . '<',
		'>Countries<'                                                  => '>' . $wort_e( 'nav_countries' ) . '<',
		'>Selectors<'                                                  => '>' . $wort_e( 'nav_selectors' ) . '<',
		'>About<'                                                      => '>' . $wort_e( 'nav_about' ) . '<',
	)
);
?>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js"></script>
<script src="<?php echo esc_url( $wort_uri . '/assets/geo.js?ver=' . $wort_ver ); ?>"></script>
<script>window.WOR = <?php echo wp_json_encode( $wort_data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?>;</script>
<script src="<?php echo esc_url( $wort_uri . '/assets/' . $wort_globe . '.js?ver=' . $wort_ver ); ?>"></script>
<?php if ( $wort_design ) : ?>
<a href="<?php echo esc_url( add_query_arg( 'design', 'current', home_url( '/' ) ) ); ?>" style="position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));z-index:99;padding:6px 12px;border-radius:999px;background:#a3302b;color:#fff;font:600 12px/1.2 'IBM Plex Mono',monospace;letter-spacing:.04em;text-decoration:none">Passport design preview · back to current</a>
<?php endif; ?>
<?php wp_footer(); ?>
</body>
</html>
