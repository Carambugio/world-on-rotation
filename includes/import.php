<?php
/**
 * One-time import of the launch content (the stage site's places, countries, selectors and playlists).
 * Runs on activation. Can be run again from Tools > World on Rotation: it only adds what is missing.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function wor_json( $file ) {
	$path = WOR_DIR . 'data/' . $file;
	if ( ! file_exists( $path ) ) {
		return array();
	}
	$d = json_decode( (string) file_get_contents( $path ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	return is_array( $d ) ? $d : array();
}

function wor_find( $type, $slug ) {
	$p = get_page_by_path( $slug, OBJECT, $type );
	return $p ? (int) $p->ID : 0;
}

function wor_insert( $type, $title, $slug, $content, $meta, $date = '' ) {
	$existing = wor_find( $type, $slug );
	if ( $existing ) {
		return array( $existing, false );
	}
	$args = array(
		'post_type'    => $type,
		'post_title'   => $title,
		'post_name'    => $slug,
		'post_content' => $content,
		'post_status'  => 'publish',
		'post_author'  => get_current_user_id() ? get_current_user_id() : 1,
	);
	if ( $date ) {
		$args['post_date'] = $date . ' 12:00:00';
	}
	$id = wp_insert_post( wp_slash( $args ) );
	if ( is_wp_error( $id ) || ! $id ) {
		return array( 0, false );
	}
	foreach ( $meta as $k => $v ) {
		update_post_meta( $id, '_wor_' . $k, $v );
	}
	return array( (int) $id, true );
}

/** Turn [name, note] pairs back into "Name | note | link" lines. */
function wor_lines_from( $pairs, $links ) {
	$out = array();
	foreach ( (array) $pairs as $pair ) {
		$name = is_array( $pair ) ? $pair[0] : $pair;
		$note = is_array( $pair ) && isset( $pair[1] ) ? $pair[1] : '';
		$url  = isset( $links[ $name ] ) ? $links[ $name ] : '';
		$line = $name;
		if ( '' !== $note || '' !== $url ) {
			$line .= ' | ' . $note;
		}
		if ( '' !== $url ) {
			$line .= ' | ' . $url;
		}
		$out[] = $line;
	}
	return implode( "\n", $out );
}

/** Country guide fields as stored in post meta. */
function wor_country_meta( $g, $links ) {
	return array(
		'traditions' => wor_lines_from( $g['traditions'] ?? array(), $links ),
		'eras'       => implode( "\n\n", (array) ( $g['eras'] ?? array() ) ),
		'diaspora'   => implode( "\n\n", (array) ( $g['diaspora'] ?? array() ) ),
		'now'        => implode( "\n\n", (array) ( $g['now'] ?? array() ) ),
		'dig'        => wor_lines_from( $g['dig'] ?? array(), $links ),
		'festivals'  => wor_lines_from( $g['festivals'] ?? array(), $links ),
		'records'    => wor_lines_from( $g['records'] ?? array(), $links ),
	);
}

/**
 * Add country guides. Existing ones are left alone unless $overwrite is true.
 * Returns the number added (and updated, if overwriting).
 */
function wor_import_countries( $cguides, $links, $overwrite = false ) {
	$n = 0;
	foreach ( (array) $cguides as $name => $g ) {
		if ( ! is_array( $g ) || ! isset( $g['map'] ) ) {
			continue;
		}
		$name    = sanitize_text_field( $name );
		$slug    = wor_slugify( $name );
		$content = implode( "\n\n", array_map( 'wp_kses_post', (array) $g['map'] ) );
		$meta    = array_map( 'wp_kses_post', wor_country_meta( $g, $links ) );
		$id      = wor_find( 'wor_country', $slug );
		if ( $id ) {
			if ( ! $overwrite ) {
				continue;
			}
			wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $content ) ) );
			foreach ( $meta as $k => $v ) {
				update_post_meta( $id, '_wor_' . $k, $v );
			}
			$n++;
			continue;
		}
		list( $id, $new ) = wor_insert( 'wor_country', $name, $slug, $content, $meta );
		$n += $new ? 1 : 0;
	}
	return $n;
}

/**
 * Bring country guides up to date with the bundled data after a plugin update,
 * without touching guides that were edited in the dashboard.
 *
 * Each guide remembers a fingerprint of the bundled text it came from and of what was saved.
 * A guide is updated only when the bundled text has changed and the saved guide is still
 * exactly as the plugin left it. Names in $force are updated regardless (one-off fixes).
 */
function wor_sync_bundled_countries( $force = array() ) {
	$guides = wor_json( 'country_info.json' );
	$links  = wor_json( 'links.json' );
	$n      = 0;
	foreach ( (array) $guides as $name => $g ) {
		if ( ! is_array( $g ) || ! isset( $g['map'] ) ) {
			continue;
		}
		$id = wor_find( 'wor_country', wor_slugify( $name ) );
		if ( ! $id ) {
			continue;
		}
		$content = implode( "\n\n", array_map( 'wp_kses_post', (array) $g['map'] ) );
		$meta    = array_map( 'wp_kses_post', wor_country_meta( $g, $links ) );
		$src     = md5( wp_json_encode( array( $content, $meta ) ) );
		$old_src = get_post_meta( $id, '_wor_bundle_src', true );
		$saved   = get_post_meta( $id, '_wor_bundle_saved', true );
		$now     = wor_country_state( $id, array_keys( $meta ) );
		$forced  = in_array( $name, (array) $force, true );
		if ( ! $forced && $old_src === $src ) {
			continue;
		}
		if ( ! $forced && ! $saved ) {
			// First run: take the guide as it stands as the plugin's own version.
			update_post_meta( $id, '_wor_bundle_src', $src );
			update_post_meta( $id, '_wor_bundle_saved', $now );
			continue;
		}
		if ( ! $forced && $now !== $saved ) {
			continue; // Edited in the dashboard: leave it alone.
		}
		wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $content ) ) );
		foreach ( $meta as $k => $v ) {
			update_post_meta( $id, '_wor_' . $k, $v );
		}
		clean_post_cache( $id );
		update_post_meta( $id, '_wor_bundle_src', $src );
		update_post_meta( $id, '_wor_bundle_saved', wor_country_state( $id, array_keys( $meta ) ) );
		$n++;
	}
	wor_flush_cache();
	return $n;
}

/** Fingerprint of a country guide as it is saved now. */
function wor_country_state( $id, $keys ) {
	$p    = get_post( $id );
	$vals = array();
	foreach ( $keys as $k ) {
		$vals[ $k ] = get_post_meta( $id, '_wor_' . $k, true );
	}
	return md5( wp_json_encode( array( $p ? $p->post_content : '', $vals ) ) );
}

/**
 * Add place guides from a file. Each place needs a country and coordinates.
 * Returns array( added_or_updated, skipped_names ).
 */
function wor_import_places( $places, $links, $overwrite = false ) {
	$n    = 0;
	$skip = array();
	foreach ( (array) $places as $name => $g ) {
		if ( ! is_array( $g ) ) {
			continue;
		}
		$name = sanitize_text_field( $name );
		if ( ! isset( $g['country'], $g['lat'], $g['lon'] ) ) {
			$skip[] = $name;
			continue;
		}
		$slug    = wor_slugify( $name );
		$content = implode( "\n\n", array_map( 'wp_kses_post', (array) ( $g['intro'] ?? array() ) ) );
		$meta    = array(
			'country' => sanitize_text_field( $g['country'] ),
			'lat'     => (string) floatval( $g['lat'] ),
			'lon'     => (string) floatval( $g['lon'] ),
			'tz'      => sanitize_text_field( $g['tz'] ?? '' ),
			'code'    => sanitize_text_field( $g['code'] ?? wor_code3( $name ) ),
			'born'    => wp_kses_post( wor_lines_from( $g['born'] ?? array(), $links ) ),
			'adopted' => wp_kses_post( wor_lines_from( $g['adopted'] ?? array(), $links ) ),
			'listen'  => wp_kses_post( wor_lines_from( $g['listen'] ?? array(), $links ) ),
			'buy'     => wp_kses_post( wor_lines_from( $g['buy'] ?? array(), $links ) ),
			'radio'   => wp_kses_post( wor_lines_from( $g['radio'] ?? array(), $links ) ),
		);
		$id = wor_find( 'wor_place', $slug );
		if ( $id ) {
			if ( ! $overwrite ) {
				continue;
			}
			wp_update_post( wp_slash( array( 'ID' => $id, 'post_content' => $content ) ) );
			foreach ( $meta as $k => $v ) {
				update_post_meta( $id, '_wor_' . $k, $v );
			}
			$n++;
			continue;
		}
		list( $id, $new ) = wor_insert( 'wor_place', $name, $slug, $content, $meta );
		$n += $new ? 1 : 0;
	}
	return array( $n, $skip );
}

/**
 * Read an uploaded guides file. Accepted shapes:
 *   { "countries": { "Name": {...} }, "places": { "Name": {...} }, "links": { "Name": "https://..." } }
 *   or just { "Country name": { "map": [...], ... } } for country guides.
 */
function wor_import_file( $path, $overwrite ) {
	$raw = json_decode( (string) file_get_contents( $path ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	if ( ! is_array( $raw ) ) {
		return new WP_Error( 'wor_bad_file', 'That file is not a guides file (it could not be read as JSON).' );
	}
	$countries = isset( $raw['countries'] ) ? $raw['countries'] : ( isset( $raw['places'] ) ? array() : $raw );
	$places    = isset( $raw['places'] ) ? $raw['places'] : array();
	$links     = array_merge( wor_json( 'links.json' ), isset( $raw['links'] ) && is_array( $raw['links'] ) ? array_map( 'esc_url_raw', $raw['links'] ) : array() );
	$c         = wor_import_countries( $countries, $links, $overwrite );
	list( $p, $skip ) = wor_import_places( $places, $links, $overwrite );
	wor_flush_cache();
	return array( 'countries' => $c, 'places' => $p, 'skipped' => $skip );
}

/** On a plugin update, add any bundled country guides that are not on the site yet. */
function wor_import_new_bundled_countries() {
	wor_import_countries( wor_json( 'country_info.json' ), wor_json( 'links.json' ) );
	wor_flush_cache();
}

/** Replace every country guide with the bundled version (used once, by the 1.3.0 update). */
function wor_refresh_bundled_countries() {
	$n = wor_import_countries( wor_json( 'country_info.json' ), wor_json( 'links.json' ), true );
	wor_flush_cache();
	return $n;
}

function wor_import_all() {
	$site    = wor_json( 'site_data.json' );
	$guides  = wor_json( 'city_info.json' );
	$cguides = wor_json( 'country_info.json' );
	$links   = wor_json( 'links.json' );
	$count   = array( 'selectors' => 0, 'places' => 0, 'countries' => 0, 'mixes' => 0, 'pages' => 0 );
	$real    = array( 'london-rpp-nov' => 'https://www.mixcloud.com/RTM_FM/rhythm-passport-presents-marco-canepari-250323/' );

	// Selectors.
	$sel_ids = array();
	foreach ( (array) ( $site['c'] ?? array() ) as $slug => $c ) {
		$link_lines = implode( "\n", array_map( function ( $l ) { return $l[0] . ' | ' . $l[1]; }, (array) $c['links'] ) );
		list( $id, $new ) = wor_insert( 'wor_selector', $c['name'], $slug, $c['bio'], array(
			'role'   => $c['role'],
			'base'   => $c['base'],
			'links'  => $link_lines,
			'sample' => ! empty( $c['sample'] ) ? '1' : '',
		) );
		$sel_ids[ $slug ] = $id;
		$count['selectors'] += $new ? 1 : 0;
	}

	// Places: one per city that has playlists, plus any place guide without playlists.
	$place_ids = array();
	$cities    = array();
	foreach ( (array) ( $site['p'] ?? array() ) as $p ) {
		if ( ! isset( $cities[ $p['city'] ] ) ) {
			$cities[ $p['city'] ] = $p;
		}
	}
	foreach ( $cities as $city => $p ) {
		$g     = $guides[ $city ] ?? array();
		$intro = implode( "\n\n", (array) ( $g['intro'] ?? array() ) );
		list( $id, $new ) = wor_insert( 'wor_place', $city, wor_slugify( $city ), $intro, array(
			'country' => $p['country'],
			'lat'     => (string) $p['lat'],
			'lon'     => (string) $p['lon'],
			'tz'      => $p['tz'] ?? '',
			'code'    => wor_code3( $city ),
			'born'    => wor_lines_from( $g['born'] ?? array(), $links ),
			'adopted' => wor_lines_from( $g['adopted'] ?? array(), $links ),
			'listen'  => wor_lines_from( $g['listen'] ?? array(), $links ),
			'buy'     => wor_lines_from( $g['buy'] ?? array(), $links ),
			'radio'   => wor_lines_from( $g['radio'] ?? array(), $links ),
		) );
		$place_ids[ $city ] = $id;
		$count['places'] += $new ? 1 : 0;
	}

	// Country guides.
	$count['countries'] += wor_import_countries( $cguides, $links );

	// Mixes and playlists.
	foreach ( (array) ( $site['p'] ?? array() ) as $p ) {
		list( $id, $new ) = wor_insert( 'wor_mix', $p['title'], wor_slugify( $p['title'] ), $p['desc'], array(
			'uid'      => $p['id'],
			'place'    => (string) ( $place_ids[ $p['city'] ] ?? 0 ),
			'selector' => (string) ( $sel_ids[ $p['by'] ] ?? 0 ),
			'minutes'  => (string) round( $p['dur'] / 60 ),
			'tracks'   => (string) $p['tracks'],
			'genres'   => implode( ', ', (array) $p['genres'] ),
			'added'    => $p['added'],
			'mixcloud' => $real[ $p['id'] ] ?? '',
		), $p['added'] );
		$count['mixes'] += $new ? 1 : 0;
	}

	// About, Privacy policy and Cookies pages.
	if ( function_exists( 'wor_create_pages' ) ) {
		wor_create_pages();
		$count['pages'] += 3;
	}

	update_option( 'wor_imported', current_time( 'mysql' ) );
	wor_flush_cache();
	return $count;
}

/** Tools > World on Rotation: re-run the import (adds only what is missing). */
function wor_tools_menu() {
	add_management_page( 'World on Rotation', 'World on Rotation', 'manage_options', 'wor-tools', 'wor_tools_page' );
}
add_action( 'admin_menu', 'wor_tools_menu' );

function wor_tools_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	echo '<div class="wrap"><h1>World on Rotation</h1>';

	if ( isset( $_POST['wor_upload'] ) && check_admin_referer( 'wor_upload' ) ) {
		if ( empty( $_FILES['wor_file']['tmp_name'] ) || ! is_uploaded_file( $_FILES['wor_file']['tmp_name'] ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			echo '<div class="notice notice-error"><p>Choose a guides file first.</p></div>';
		} else {
			$r = wor_import_file( $_FILES['wor_file']['tmp_name'], ! empty( $_POST['wor_overwrite'] ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			if ( is_wp_error( $r ) ) {
				echo '<div class="notice notice-error"><p>' . esc_html( $r->get_error_message() ) . '</p></div>';
			} else {
				$verb = ! empty( $_POST['wor_overwrite'] ) ? 'Added or updated' : 'Added';
				printf( '<div class="notice notice-success"><p>%s %d country guides and %d places. They are on the globe now.%s</p></div>', esc_html( $verb ), (int) $r['countries'], (int) $r['places'], $r['skipped'] ? ' Skipped (no coordinates): ' . esc_html( implode( ', ', $r['skipped'] ) ) . '.' : '' );
			}
		}
	}
	if ( isset( $_POST['wor_reimport'] ) && check_admin_referer( 'wor_reimport' ) ) {
		$c = wor_import_all();
		flush_rewrite_rules();
		printf(
			'<div class="notice notice-success"><p>Done. Added %d selectors, %d places, %d country guides, %d mixes and playlists, %d pages. Anything that already existed was left as it is.</p></div>',
			(int) $c['selectors'], (int) $c['places'], (int) $c['countries'], (int) $c['mixes'], (int) $c['pages']
		);
	}
	if ( isset( $_POST['wor_clearcache'] ) && check_admin_referer( 'wor_reimport' ) ) {
		wor_flush_cache();
		echo '<div class="notice notice-success"><p>Cache cleared. The globe now shows the latest content.</p></div>';
	}

	$counts = array(
		'countries' => wp_count_posts( 'wor_country' )->publish,
		'places'    => wp_count_posts( 'wor_place' )->publish,
		'mixes'     => wp_count_posts( 'wor_mix' )->publish,
	);
	printf( '<p>On the site now: <strong>%d</strong> country guides, <strong>%d</strong> places, <strong>%d</strong> mixes and playlists.</p>', (int) $counts['countries'], (int) $counts['places'], (int) $counts['mixes'] );

	echo '<h2>Add guides from a file</h2>';
	echo '<form method="post" enctype="multipart/form-data">';
	wp_nonce_field( 'wor_upload' );
	echo '<p><input type="file" name="wor_file" accept=".json,application/json"></p>';
	echo '<p><label><input type="checkbox" name="wor_overwrite" value="1"> Also update guides that are already on the site (replaces their text with the file\'s)</label></p>';
	echo '<p><button class="button button-primary" name="wor_upload" value="1">Upload and add</button></p>';
	echo '<p class="description">Use the .json guides files Claude prepares. New countries and places appear on the globe straight away. Without the tick, guides you already have are never touched.</p></form>';

	echo '<h2>Launch content</h2>';
	$when = get_option( 'wor_imported' );
	echo '<p>' . ( $when ? 'The launch content was imported on ' . esc_html( $when ) . '.' : 'The launch content has not been imported yet.' ) . '</p>';
	echo '<form method="post">';
	wp_nonce_field( 'wor_reimport' );
	echo '<p><button class="button" name="wor_reimport" value="1">Import missing launch content</button> ';
	echo '<button class="button" name="wor_clearcache" value="1">Clear the globe cache</button></p>';
	echo '<p class="description">Import only adds items that are not there yet, so it never overwrites your edits. It will bring back sample items you deleted.</p></form></div>';
}
