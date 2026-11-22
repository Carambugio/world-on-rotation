<?php
/**
 * Content types. Their URLs match the stage site: /playlists/, /selectors/, /places/, /countries/.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function wor_register_post_types() {
	register_post_type(
		'wor_mix',
		array(
			'labels'          => array(
				'name'          => 'Mixes & Playlists',
				'singular_name' => 'Mix or playlist',
				'add_new_item'  => 'Add a mix or playlist',
				'edit_item'     => 'Edit mix or playlist',
				'all_items'     => 'All mixes & playlists',
				'menu_name'     => 'Mixes & Playlists',
			),
			'public'          => true,
			'has_archive'     => 'playlists',
			'rewrite'         => array( 'slug' => 'playlists', 'with_front' => false ),
			'menu_icon'       => 'dashicons-format-audio',
			'menu_position'   => 5,
			'supports'        => array( 'title', 'editor', 'author', 'revisions' ),
			'capability_type' => array( 'wor_mix', 'wor_mixes' ),
			'map_meta_cap'    => true,
			'show_in_rest'    => false,
		)
	);

	register_post_type(
		'wor_selector',
		array(
			'labels'        => array(
				'name'          => 'Selectors',
				'singular_name' => 'Selector',
				'add_new_item'  => 'Add a selector',
				'edit_item'     => 'Edit selector',
			),
			'public'        => true,
			'has_archive'   => 'selectors',
			'rewrite'       => array( 'slug' => 'selectors', 'with_front' => false ),
			'menu_icon'     => 'dashicons-id-alt',
			'menu_position' => 6,
			'supports'      => array( 'title', 'editor', 'revisions' ),
			'show_in_rest'  => false,
		)
	);

	register_post_type(
		'wor_place',
		array(
			'labels'        => array(
				'name'          => 'Places',
				'singular_name' => 'Place',
				'add_new_item'  => 'Add a place',
				'edit_item'     => 'Edit place',
			),
			'public'        => true,
			'has_archive'   => 'places',
			'rewrite'       => array( 'slug' => 'places', 'with_front' => false ),
			'menu_icon'     => 'dashicons-location',
			'menu_position' => 7,
			'supports'      => array( 'title', 'editor', 'revisions' ),
			'show_in_rest'  => false,
		)
	);

	register_post_type(
		'wor_country',
		array(
			'labels'        => array(
				'name'          => 'Countries',
				'singular_name' => 'Country',
				'add_new_item'  => 'Add a country guide',
				'edit_item'     => 'Edit country guide',
			),
			'public'        => true,
			'has_archive'   => 'countries',
			'rewrite'       => array( 'slug' => 'countries', 'with_front' => false ),
			'menu_icon'     => 'dashicons-admin-site-alt3',
			'menu_position' => 8,
			'supports'      => array( 'title', 'editor', 'revisions' ),
			'show_in_rest'  => false,
		)
	);
}
add_action( 'init', 'wor_register_post_types' );

/** Show every item on the archive pages (the theme lays them out as cards). */
function wor_archive_all( $q ) {
	if ( ! is_admin() && $q->is_main_query() && $q->is_post_type_archive( array( 'wor_mix', 'wor_selector', 'wor_place', 'wor_country' ) ) ) {
		$q->set( 'posts_per_page', -1 );
	}
}
add_action( 'pre_get_posts', 'wor_archive_all' );

/** Rename the editor box so it says what it holds. */
function wor_editor_hint( $post ) {
	$hints = array(
		'wor_mix'      => 'Description: one or two sentences about the mix or playlist.',
		'wor_selector' => 'Bio: a short paragraph about the selector.',
		'wor_place'    => 'Intro: the opening paragraphs of the place guide.',
		'wor_country'  => 'Musical map: the opening paragraphs of the country guide.',
	);
	if ( isset( $hints[ $post->post_type ] ) ) {
		echo '<p style="margin:16px 0 4px;font-weight:600">' . esc_html( $hints[ $post->post_type ] ) . '</p>';
	}
}
add_action( 'edit_form_after_title', 'wor_editor_hint' );

/** Plain editor for these types: the text is shown as paragraphs, no blocks needed. */
function wor_no_blocks( $use, $post_type ) {
	if ( in_array( $post_type, array( 'wor_mix', 'wor_selector', 'wor_place', 'wor_country' ), true ) ) {
		return false;
	}
	return $use;
}
add_filter( 'use_block_editor_for_post_type', 'wor_no_blocks', 10, 2 );
