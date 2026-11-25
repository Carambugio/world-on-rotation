<?php
/**
 * Edit screens: one box of fields per content type.
 * List fields take one entry per line: Name | note | link (note and link optional).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Field definitions per post type. type: text, number, date, url, lines, paras, checkbox, place, selector, tz.
 */
function wor_fields( $post_type ) {
	$lines_help = 'One per line: Name | note | link. The note and the link are optional.';
	$defs       = array(
		'wor_mix'      => array(
			'place'     => array( 'Place', 'place', 'Pick the place this mix or playlist belongs to. If it is not in the list, fill in "New place" below and an editor will add it.' ),
			'new_place' => array( 'New place (if not in the list)', 'text', 'Place name, country. For example: Ségou, Mali' ),
			'selector'  => array( 'Selector', 'selector', '' ),
			'mixcloud'  => array( 'Mixcloud link', 'url', 'Paste the Mixcloud page address, for example https://www.mixcloud.com/name/show-name/' ),
			'spotify'   => array( 'Spotify link', 'url', 'For playlists: paste the Spotify share link. Used when there is no Mixcloud link.' ),
			'audio'     => array( 'Audio file sent by the selector', 'url', 'Download it, upload it to the World on Rotation Mixcloud with the tracklist below, then paste the new Mixcloud link above. Transfer links expire, so download it soon.' ),
			'tracklist' => array( 'Tracklist', 'paras', 'One track per line. Paste it into Mixcloud when you upload.' ),
			'qa'        => array( 'Q&A', 'paras', 'Shown on the mix page. Each question on its own line with the answer on the next, and an empty line between pairs.' ),
			'minutes'   => array( 'Duration (minutes)', 'number', '' ),
			'tracks'    => array( 'Number of tracks', 'number', '' ),
			'genres'    => array( 'Tags', 'text', 'Three to five, separated by commas: styles, the country, main artists. For example: highlife, Ghana, E.T. Mensah. Mixcloud takes up to five tags too.' ),
			'added'     => array( 'Date added', 'date', 'Shown on the stamp. Leave empty to use today.' ),
		),
		'wor_selector' => array(
			'role'   => array( 'Role', 'text', 'For example: DJ and record collector' ),
			'base'   => array( 'Based in', 'text', '' ),
			'nationality' => array( 'Nationality', 'text', '' ),
			'fullname'    => array( 'Full name', 'text', 'Optional, if different from the name above.' ),
			'email'       => array( 'Email', 'text', 'Only for contacting them. Never shown on the site.' ),
			'links'  => array( 'Links', 'lines', 'One per line: Label | link. For example: Mixcloud | https://www.mixcloud.com/name/' ),
			'sample' => array( 'Sample profile', 'checkbox', 'Tick for placeholder profiles. Untick once the profile is real.' ),
		),
		'wor_place'    => array(
			'country' => array( 'Country', 'text', 'Exactly as the globe names it, for example: United Kingdom, DR Congo, Türkiye' ),
			'lat'     => array( 'Latitude', 'text', 'Decimal, for example 51.51 (south is negative)' ),
			'lon'     => array( 'Longitude', 'text', 'Decimal, for example -0.13 (west is negative)' ),
			'tz'      => array( 'Time zone', 'text', 'For the local clock, for example Europe/London or Africa/Lagos' ),
			'code'    => array( 'Stamp code', 'text', 'Three letters on the passport stamp. Leave empty to use the first three letters of the name.' ),
			'whole'   => array( 'Whole country', 'checkbox', 'Tick when the mixes here belong to the whole country rather than one town, for example highlife from Ghana. The country name becomes the stamp, with no pin of its own. Name the place after the country and put its middle in Latitude and Longitude.' ),
			'born'    => array( 'Born here', 'lines', 'One artist per line: Name | link' ),
			'adopted' => array( 'Made it home', 'lines', $lines_help ),
			'listen'  => array( 'Hear it live', 'lines', $lines_help ),
			'buy'     => array( 'Find the records', 'lines', $lines_help ),
			'radio'   => array( 'Tune in', 'lines', $lines_help ),
		),
		'wor_country'  => array(
			'traditions' => array( 'Traditions and instruments', 'lines', $lines_help ),
			'eras'       => array( 'Key eras and labels', 'paras', 'Paragraphs, separated by an empty line.' ),
			'diaspora'   => array( 'Diaspora', 'paras', 'Paragraphs, separated by an empty line.' ),
			'now'        => array( 'The scene now', 'paras', 'Paragraphs, separated by an empty line.' ),
			'dig'        => array( 'Where to dig', 'lines', $lines_help ),
			'festivals'  => array( 'Festivals', 'lines', $lines_help ),
			'records'    => array( 'Start here (records)', 'lines', 'One per line: Title | artist · label, year | link' ),
		),
	);
	return isset( $defs[ $post_type ] ) ? $defs[ $post_type ] : array();
}

function wor_meta( $post_id, $key ) {
	return get_post_meta( $post_id, '_wor_' . $key, true );
}

function wor_add_boxes() {
	$titles = array(
		'wor_mix'      => 'Mix or playlist details',
		'wor_selector' => 'Selector details',
		'wor_place'    => 'Place details and music guide',
		'wor_country'  => 'Country guide',
	);
	foreach ( $titles as $type => $title ) {
		add_meta_box( 'wor_fields', $title, 'wor_render_box', $type, 'normal', 'high' );
	}
}
add_action( 'add_meta_boxes', 'wor_add_boxes' );

function wor_render_box( $post ) {
	wp_nonce_field( 'wor_save_fields', 'wor_fields_nonce' );
	$is_editor = current_user_can( 'edit_others_wor_mixes' );
	echo '<style>.wor-f{margin:0 0 16px}.wor-f label{display:block;font-weight:600;margin-bottom:4px}.wor-f input[type=text],.wor-f input[type=url],.wor-f input[type=number],.wor-f input[type=date],.wor-f select,.wor-f textarea{width:100%;max-width:760px}.wor-f textarea{font-family:inherit;line-height:1.5}.wor-f .description{margin-top:4px}</style>';
	foreach ( wor_fields( $post->post_type ) as $key => $def ) {
		list( $label, $type, $help ) = $def;
		$name  = 'wor_' . $key;
		$value = wor_meta( $post->ID, $key );
		if ( 'selector' === $type && ! $is_editor ) {
			continue; // Selectors are credited automatically.
		}
		echo '<div class="wor-f"><label for="' . esc_attr( $name ) . '">' . esc_html( $label ) . '</label>';
		switch ( $type ) {
			case 'place':
				$places = get_posts( array( 'post_type' => 'wor_place', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC', 'post_status' => 'publish' ) );
				echo '<select name="' . esc_attr( $name ) . '" id="' . esc_attr( $name ) . '"><option value="0">Choose a place</option>';
				foreach ( $places as $p ) {
					printf( '<option value="%d"%s>%s</option>', (int) $p->ID, selected( (int) $value, $p->ID, false ), esc_html( $p->post_title . ', ' . wor_meta( $p->ID, 'country' ) ) );
				}
				echo '</select>';
				break;
			case 'selector':
				$sels = get_posts( array( 'post_type' => 'wor_selector', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC', 'post_status' => 'any' ) );
				echo '<select name="' . esc_attr( $name ) . '" id="' . esc_attr( $name ) . '"><option value="0">Choose a selector</option>';
				foreach ( $sels as $s ) {
					printf( '<option value="%d"%s>%s</option>', (int) $s->ID, selected( (int) $value, $s->ID, false ), esc_html( $s->post_title ) );
				}
				echo '</select>';
				break;
			case 'lines':
			case 'paras':
				$rows = 'paras' === $type ? 6 : max( 4, min( 14, substr_count( (string) $value, "\n" ) + 2 ) );
				echo '<textarea name="' . esc_attr( $name ) . '" id="' . esc_attr( $name ) . '" rows="' . (int) $rows . '">' . esc_textarea( $value ) . '</textarea>';
				break;
			case 'checkbox':
				echo '<input type="checkbox" name="' . esc_attr( $name ) . '" id="' . esc_attr( $name ) . '" value="1"' . checked( $value, '1', false ) . '>';
				break;
			case 'number':
				echo '<input type="number" min="0" step="1" name="' . esc_attr( $name ) . '" id="' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '">';
				break;
			case 'date':
				echo '<input type="date" name="' . esc_attr( $name ) . '" id="' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '">';
				break;
			case 'url':
				echo '<input type="url" name="' . esc_attr( $name ) . '" id="' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '">';
				break;
			default:
				echo '<input type="text" name="' . esc_attr( $name ) . '" id="' . esc_attr( $name ) . '" value="' . esc_attr( $value ) . '">';
		}
		if ( $help ) {
			echo '<p class="description">' . esc_html( $help ) . '</p>';
		}
		echo '</div>';
	}
}

function wor_save_fields( $post_id, $post ) {
	if ( ! isset( $_POST['wor_fields_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['wor_fields_nonce'] ), 'wor_save_fields' ) ) {
		return;
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	foreach ( wor_fields( $post->post_type ) as $key => $def ) {
		$type  = $def[1];
		$field = 'wor_' . $key;
		if ( 'checkbox' === $type ) {
			update_post_meta( $post_id, '_wor_' . $key, isset( $_POST[ $field ] ) ? '1' : '' );
			continue;
		}
		if ( ! isset( $_POST[ $field ] ) ) {
			continue;
		}
		$raw = wp_unslash( $_POST[ $field ] ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		switch ( $type ) {
			case 'place':
			case 'selector':
			case 'number':
				$val = (string) absint( $raw );
				break;
			case 'url':
				$val = esc_url_raw( trim( $raw ) );
				break;
			case 'date':
				$val = preg_match( '/^\d{4}-\d{2}-\d{2}$/', $raw ) ? $raw : '';
				break;
			case 'lines':
			case 'paras':
				$val = sanitize_textarea_field( $raw );
				break;
			default:
				$val = sanitize_text_field( $raw );
		}
		if ( in_array( $key, array( 'lat', 'lon' ), true ) ) {
			$val = is_numeric( $val ) ? (string) round( (float) $val, 4 ) : '';
		}
		update_post_meta( $post_id, '_wor_' . $key, $val );
	}
	if ( 'wor_mix' === $post->post_type ) {
		if ( ! current_user_can( 'edit_others_wor_mixes' ) ) {
			update_post_meta( $post_id, '_wor_selector', (string) wor_user_selector_id() );
		}
		if ( ! wor_meta( $post_id, 'added' ) ) {
			update_post_meta( $post_id, '_wor_added', current_time( 'Y-m-d' ) );
		}
		if ( ! wor_meta( $post_id, 'uid' ) ) {
			update_post_meta( $post_id, '_wor_uid', $post->post_name ? $post->post_name : 'mix-' . $post_id );
		}
	}
	wor_flush_cache();
}
add_action( 'save_post', 'wor_save_fields', 10, 2 );

/** Admin list columns for mixes: place, selector, status at a glance. */
function wor_mix_columns( $cols ) {
	$new = array();
	foreach ( $cols as $k => $v ) {
		$new[ $k ] = $v;
		if ( 'title' === $k ) {
			$new['wor_place']    = 'Place';
			$new['wor_selector'] = 'Selector';
		}
	}
	unset( $new['author'] );
	return $new;
}
add_filter( 'manage_wor_mix_posts_columns', 'wor_mix_columns' );

function wor_mix_column( $col, $post_id ) {
	if ( 'wor_place' === $col ) {
		$p = get_post( (int) wor_meta( $post_id, 'place' ) );
		echo $p ? esc_html( $p->post_title ) : esc_html( (string) wor_meta( $post_id, 'new_place' ) );
	}
	if ( 'wor_selector' === $col ) {
		$s = get_post( (int) wor_meta( $post_id, 'selector' ) );
		echo $s ? esc_html( $s->post_title ) : '';
	}
}
add_action( 'manage_wor_mix_posts_custom_column', 'wor_mix_column', 10, 2 );
