<?php
/**
 * World on Rotation theme.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WORT_VERSION', wp_get_theme( get_template() )->get( 'Version' ) );

require_once get_template_directory() . '/inc/template-tags.php';
require_once get_template_directory() . '/inc/customizer.php';

function wort_setup() {
	add_theme_support( 'title-tag' );
	add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support( 'custom-logo', array( 'height' => 120, 'width' => 480, 'flex-height' => true, 'flex-width' => true ) );
	register_nav_menus( array( 'main' => 'Main menu (optional, replaces the default links)' ) );
}
add_action( 'after_setup_theme', 'wort_setup' );

function wort_fonts_url() {
	return 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..700,0..100&family=Instrument+Sans:wght@400..600&family=IBM+Plex+Mono:wght@400;500;600&family=Barlow+Condensed:wght@500;600&display=swap';
}

function wort_assets() {
	if ( is_front_page() ) {
		return; // The globe page loads its own files.
	}
	wp_enqueue_style( 'wort-fonts', wort_fonts_url(), array(), null );
	wp_enqueue_style( 'wort-site', get_template_directory_uri() . '/assets/site.css', array( 'wort-fonts' ), WORT_VERSION );
}
add_action( 'wp_enqueue_scripts', 'wort_assets' );

/** The globe fills the screen: no admin bar on top of it. */
function wort_admin_bar( $show ) {
	return is_front_page() ? false : $show;
}
add_filter( 'show_admin_bar', 'wort_admin_bar' );

/** Every link on the site opens in a new tab. */
function wort_base_target() {
	if ( ! is_front_page() ) {
		echo '<base target="_blank">' . "\n";
	}
}
add_action( 'wp_head', 'wort_base_target', 1 );

/** A gentle notice if the content plugin is missing. */
function wort_plugin_notice() {
	if ( ! function_exists( 'wor_data' ) && current_user_can( 'activate_plugins' ) ) {
		echo '<div class="notice notice-warning"><p><strong>World on Rotation:</strong> install and activate the World on Rotation plugin, which holds the places, countries, selectors and mixes.</p></div>';
	}
}
add_action( 'admin_notices', 'wort_plugin_notice' );

/** Page titles like the stage site: "The sound of Lisbon · World on Rotation". */
function wort_title_parts( $parts ) {
	if ( is_front_page() || is_home() ) {
		// WordPress already gives the home page "Name · Tagline"; don't add the name again.
		unset( $parts['site'] );
		return $parts;
	}
	$parts['site'] = get_bloginfo( 'name' );
	if ( is_singular( array( 'wor_place', 'wor_country' ) ) ) {
		$parts['title'] = wort_t( 'sound_of' ) . ' ' . ( is_singular( 'wor_country' ) && function_exists( 'wor_the_name' ) ? wor_the_name( single_post_title( '', false ) ) : single_post_title( '', false ) );
	}
	if ( is_post_type_archive( 'wor_mix' ) ) {
		$parts['title'] = 'Mixes and playlists';
	}
	if ( is_post_type_archive( 'wor_country' ) ) {
		$parts['title'] = 'Country guides';
	}
	return $parts;
}
add_filter( 'document_title_parts', 'wort_title_parts' );

function wort_title_sep() {
	return '·';
}
add_filter( 'document_title_separator', 'wort_title_sep' );

/** Meta description for sharing. */
function wort_meta_description() {
	if ( is_front_page() || ! function_exists( 'wor_data' ) ) {
		return;
	}
	$desc = '';
	if ( is_singular() ) {
		$post = get_queried_object();
		$desc = wp_trim_words( wp_strip_all_tags( $post->post_content ), 28, '...' );
	}
	if ( $desc ) {
		echo '<meta name="description" content="' . esc_attr( $desc ) . '">' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $desc ) . '">' . "\n";
	}
	echo '<meta property="og:title" content="' . esc_attr( wp_get_document_title() ) . '">' . "\n";
	echo '<meta name="theme-color" content="#070c14">' . "\n";
}
add_action( 'wp_head', 'wort_meta_description', 2 );
