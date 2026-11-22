<?php
/**
 * Reads everything back out in the shapes the globe and the theme use.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function wor_flush_cache() {
	delete_transient( 'wor_data_v1' );
}
add_action( 'deleted_post', 'wor_flush_cache' );
add_action( 'trashed_post', 'wor_flush_cache' );
add_action( 'untrashed_post', 'wor_flush_cache' );
add_action( 'transition_post_status', 'wor_flush_cache' );

function wor_rows_pairs( $rows ) {
	$out = array();
	foreach ( $rows as $r ) {
		$out[] = array( $r['name'], $r['note'] );
	}
	return $out;
}

/**
 * Everything in one array:
 *  C       selectors by slug
 *  P       published mixes and playlists (newest first)
 *  CITY    places by name, each with its items
 *  GUIDE   place guides by name
 *  CGUIDE  country guides by name
 *  LINKS   name => link, from every list field
 */
function wor_data() {
	static $cache = null;
	if ( null !== $cache ) {
		return $cache;
	}
	$cached = get_transient( 'wor_data_v1' );
	if ( is_array( $cached ) ) {
		$cache = $cached;
		return $cache;
	}

	$links = array();
	$take  = function ( $rows ) use ( &$links ) {
		foreach ( $rows as $r ) {
			if ( $r['url'] && ! isset( $links[ $r['name'] ] ) ) {
				$links[ $r['name'] ] = $r['url'];
			}
		}
		return $rows;
	};

	// Selectors.
	$C        = array();
	$sel_slug = array();
	foreach ( get_posts( array( 'post_type' => 'wor_selector', 'numberposts' => -1, 'post_status' => 'publish', 'orderby' => 'menu_order title', 'order' => 'ASC' ) ) as $s ) {
		$links_rows = wor_parse_lines( wor_meta( $s->ID, 'links' ) );
		$C[ $s->post_name ] = array(
			'name'   => $s->post_title,
			'role'   => (string) wor_meta( $s->ID, 'role' ),
			'base'   => (string) wor_meta( $s->ID, 'base' ),
			'nationality' => (string) wor_meta( $s->ID, 'nationality' ),
			'photo'  => (string) get_the_post_thumbnail_url( $s, 'medium' ),
			'sample' => '1' === wor_meta( $s->ID, 'sample' ),
			'bio'    => wp_strip_all_tags( implode( ' ', wor_content_paras( $s ) ) ),
			'links'  => array_map( function ( $r ) { return array( $r['name'], $r['url'] ? $r['url'] : $r['note'] ); }, $links_rows ),
			'url'    => get_permalink( $s ),
		);
		$sel_slug[ $s->ID ] = $s->post_name;
	}

	// Places.
	$places   = array();
	$GUIDE    = array();
	$place_by = array();
	foreach ( get_posts( array( 'post_type' => 'wor_place', 'numberposts' => -1, 'post_status' => 'publish', 'orderby' => 'title', 'order' => 'ASC' ) ) as $pl ) {
		$name   = $pl->post_title;
		$code   = strtoupper( (string) wor_meta( $pl->ID, 'code' ) );
		$places[ $name ] = array(
			'city'    => $name,
			'country' => (string) wor_meta( $pl->ID, 'country' ),
			'lat'     => (float) wor_meta( $pl->ID, 'lat' ),
			'lon'     => (float) wor_meta( $pl->ID, 'lon' ),
			'tz'      => (string) wor_meta( $pl->ID, 'tz' ),
			'code'    => $code ? $code : wor_code3( $name ),
			'slug'    => $pl->post_name,
			'url'     => get_permalink( $pl ),
			'date'    => get_the_date( 'Y-m-d', $pl ),
			'items'   => array(),
		);
		$place_by[ $pl->ID ] = $name;
		$intro               = wor_content_paras( $pl );
		$born                = $take( wor_parse_lines( wor_meta( $pl->ID, 'born' ) ) );
		$g                   = array(
			'intro'   => $intro,
			'born'    => array_map( function ( $r ) { return $r['name']; }, $born ),
			'adopted' => wor_rows_pairs( $take( wor_parse_lines( wor_meta( $pl->ID, 'adopted' ) ) ) ),
			'listen'  => wor_rows_pairs( $take( wor_parse_lines( wor_meta( $pl->ID, 'listen' ) ) ) ),
			'buy'     => wor_rows_pairs( $take( wor_parse_lines( wor_meta( $pl->ID, 'buy' ) ) ) ),
			'radio'   => wor_rows_pairs( $take( wor_parse_lines( wor_meta( $pl->ID, 'radio' ) ) ) ),
		);
		if ( $intro || $g['born'] || $g['adopted'] || $g['listen'] || $g['buy'] || $g['radio'] ) {
			$GUIDE[ $name ] = $g;
		}
	}

	// Countries.
	$CGUIDE = array();
	foreach ( get_posts( array( 'post_type' => 'wor_country', 'numberposts' => -1, 'post_status' => 'publish', 'orderby' => 'title', 'order' => 'ASC' ) ) as $co ) {
		$CGUIDE[ $co->post_title ] = array(
			'map'        => wor_content_paras( $co ),
			'traditions' => wor_rows_pairs( $take( wor_parse_lines( wor_meta( $co->ID, 'traditions' ) ) ) ),
			'eras'       => wor_parse_paras( wor_meta( $co->ID, 'eras' ) ),
			'diaspora'   => wor_parse_paras( wor_meta( $co->ID, 'diaspora' ) ),
			'now'        => wor_parse_paras( wor_meta( $co->ID, 'now' ) ),
			'dig'        => wor_rows_pairs( $take( wor_parse_lines( wor_meta( $co->ID, 'dig' ) ) ) ),
			'festivals'  => wor_rows_pairs( $take( wor_parse_lines( wor_meta( $co->ID, 'festivals' ) ) ) ),
			'records'    => wor_rows_pairs( $take( wor_parse_lines( wor_meta( $co->ID, 'records' ) ) ) ),
			'slug'       => $co->post_name,
			'url'        => get_permalink( $co ),
		);
	}

	// Mixes and playlists.
	$P = array();
	foreach ( get_posts( array( 'post_type' => 'wor_mix', 'numberposts' => -1, 'post_status' => 'publish' ) ) as $m ) {
		$place_id = (int) wor_meta( $m->ID, 'place' );
		$sel_id   = (int) wor_meta( $m->ID, 'selector' );
		if ( ! isset( $place_by[ $place_id ] ) || ! isset( $sel_slug[ $sel_id ] ) ) {
			continue; // Not shown until it has a published place and selector.
		}
		$pl     = $places[ $place_by[ $place_id ] ];
		$added  = (string) wor_meta( $m->ID, 'added' );
		$genres = array_values( array_filter( array_map( 'trim', explode( ',', (string) wor_meta( $m->ID, 'genres' ) ) ) ) );
		$uid    = (string) wor_meta( $m->ID, 'uid' );
		$item   = array(
			'id'       => $uid ? $uid : $m->post_name,
			'slug'     => $m->post_name,
			'city'     => $pl['city'],
			'country'  => $pl['country'],
			'lat'      => $pl['lat'],
			'lon'      => $pl['lon'],
			'tz'       => $pl['tz'],
			'code'     => $pl['code'],
			'title'    => $m->post_title,
			'by'       => $sel_slug[ $sel_id ],
			'dur'      => 60 * (int) wor_meta( $m->ID, 'minutes' ),
			'tracks'   => (int) wor_meta( $m->ID, 'tracks' ),
			'genres'   => $genres,
			'added'    => $added ? $added : get_the_date( 'Y-m-d', $m ),
			'desc'     => wp_strip_all_tags( implode( ' ', wor_content_paras( $m ) ) ),
			'mixcloud' => wor_mixcloud_feed( wor_meta( $m->ID, 'mixcloud' ) ),
			'spotify'  => wor_spotify_embed( wor_meta( $m->ID, 'spotify' ) ),
			'url'      => get_permalink( $m ),
		);
		$P[] = $item;
	}
	usort( $P, function ( $a, $b ) { return strcmp( $b['added'], $a['added'] ); } );
	foreach ( $P as $item ) {
		$places[ $item['city'] ]['items'][] = $item;
	}

	$cache = array(
		'C'      => $C,
		'P'      => $P,
		'CITY'   => $places,
		'GUIDE'  => $GUIDE,
		'CGUIDE' => $CGUIDE,
		'LINKS'  => $links,
	);
	set_transient( 'wor_data_v1', $cache, DAY_IN_SECONDS );
	return $cache;
}

/** The data the globe page needs, in the globe's own shapes. */
function wor_globe_data() {
	$d     = wor_data();
	$small = array();
	foreach ( $d['P'] as $p ) {
		$row            = array_intersect_key( $p, array_flip( array( 'id', 'slug', 'city', 'country', 'lat', 'lon', 'tz', 'title', 'by', 'dur', 'tracks', 'genres', 'added', 'desc', 'mixcloud', 'spotify' ) ) );
		$row['country'] = wor_globe_country_name( $row['country'] );
		$small[]        = $row;
	}
	$comp = array();
	foreach ( $d['C'] as $slug => $c ) {
		$comp[ $slug ] = array_intersect_key( $c, array_flip( array( 'name', 'role', 'base', 'nationality', 'photo', 'sample', 'bio', 'links' ) ) );
	}
	$cg = array();
	foreach ( $d['CGUIDE'] as $n => $g ) {
		unset( $g['url'], $g['slug'] );
		$cg[ $n ] = $g;
	}
	// The globe's map uses short names for a few countries; give their guides those names too.
	foreach ( wor_country_aliases() as $full => $short ) {
		if ( isset( $cg[ $full ] ) && ! isset( $cg[ $short ] ) ) {
			$cg[ $short ] = $cg[ $full ];
		}
	}
	foreach ( wor_globe_extra_shapes() as $shape => $full ) {
		if ( isset( $cg[ $full ] ) && ! isset( $cg[ $shape ] ) ) {
			$cg[ $shape ] = $cg[ $full ];
		}
	}
	return array(
		'playlists' => $small,
		'selectors' => $comp,
		'places'    => (object) $d['GUIDE'],
		'countries' => (object) $cg,
		'links'     => (object) $d['LINKS'],
	);
}

/** Full country name => the name the globe's map uses. */
function wor_country_aliases() {
	return array(
		'Dominican Republic'               => 'Dominican Rep.',
		'Democratic Republic of the Congo' => 'DR Congo',
		'Republic of the Congo'            => 'Congo',
		'Central African Republic'         => 'Central African Rep.',
		'Bosnia and Herzegovina'           => 'Bosnia & Herz.',
		'Antigua and Barbuda'              => 'Antigua and Barb.',
		'Cook Islands'                     => 'Cook Is.',
		'Faroe Islands'                    => 'Faeroe Is.',
		'French Polynesia'                 => 'Fr. Polynesia',
		'Saint Kitts and Nevis'            => 'St. Kitts and Nevis',
		'Saint Vincent and the Grenadines' => 'St. Vin. and Gren.',
		'São Tomé and Príncipe'            => 'São Tomé and Principe',
		'United States Virgin Islands'     => 'U.S. Virgin Is.',
		'Vatican City'                     => 'Vatican',
	);
}

/** Extra map shapes with no guide of their own => the guide that covers them. */
function wor_globe_extra_shapes() {
	return array(
		'N. Cyprus'      => 'Cyprus',
		'American Samoa' => 'Samoa',
		'N. Mariana Is.' => 'Guam',
	);
}

/** Links built from a short map name (e.g. /countries/dominican-rep/) go to the real page. */
function wor_country_alias_redirect() {
	if ( ! is_404() ) {
		return;
	}
	$path = trim( (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '', PHP_URL_PATH ), '/' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	if ( ! preg_match( '#(?:^|/)countries/([^/]+)$#', $path, $m ) ) {
		return;
	}
	foreach ( array_merge( wor_country_aliases(), array_flip( wor_globe_extra_shapes() ) ) as $full => $short ) {
		if ( wor_slugify( $short ) === $m[1] ) {
			wp_safe_redirect( home_url( '/countries/' . wor_slugify( $full ) . '/' ), 301 );
			exit;
		}
	}
}
add_action( 'template_redirect', 'wor_country_alias_redirect' );

/** The name the globe's map uses for a country (its own short name where it differs). */
function wor_globe_country_name( $name ) {
	$a = wor_country_aliases();
	return isset( $a[ $name ] ) ? $a[ $name ] : $name;
}

/**
 * One-off renames to current official country names: the guide post (title and address,
 * the old address keeps working) and the country field of places.
 */
function wor_rename_countries() {
	$map = array(
		'DR Congo' => 'Democratic Republic of the Congo',
		'Congo'    => 'Republic of the Congo',
	);
	foreach ( $map as $old => $new ) {
		$posts = get_posts( array( 'post_type' => 'wor_country', 'title' => $old, 'post_status' => 'any', 'numberposts' => 1 ) );
		if ( $posts && ! get_posts( array( 'post_type' => 'wor_country', 'title' => $new, 'post_status' => 'any', 'numberposts' => 1 ) ) ) {
			wp_update_post( array( 'ID' => $posts[0]->ID, 'post_title' => $new, 'post_name' => wor_slugify( $new ) ) );
		}
		foreach ( get_posts( array( 'post_type' => 'wor_place', 'numberposts' => -1, 'post_status' => 'any', 'meta_key' => '_wor_country', 'meta_value' => $old ) ) as $pl ) { // phpcs:ignore WordPress.DB.SlowDBQuery
			update_post_meta( $pl->ID, '_wor_country', $new );
		}
	}
	wor_flush_cache();
}
