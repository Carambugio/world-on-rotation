<?php
/**
 * The plugin carries the World on Rotation theme, so one deployment updates both.
 *
 * When the bundled theme is newer than the installed one, its files are copied over the
 * installed theme folder. Files are only added or replaced, never deleted, and the theme's
 * Customizer settings are untouched because the folder keeps its name.
 *
 * @package World_On_Rotation
 */

defined( 'ABSPATH' ) || exit;

/** Folder of the installed World on Rotation theme ('' if there is none). */
function wor_installed_theme_dir() {
	$name   = 'World on Rotation';
	$active = wp_get_theme();
	if ( $active->exists() && ( $active->get( 'Name' ) === $name || ( $active->parent() && $active->parent()->get( 'Name' ) === $name ) ) ) {
		$t = $active->get( 'Name' ) === $name ? $active : $active->parent();
		return array( $t->get_stylesheet_directory(), (string) $t->get( 'Version' ) );
	}
	foreach ( wp_get_themes() as $t ) {
		if ( $t->get( 'Name' ) === $name ) {
			return array( $t->get_stylesheet_directory(), (string) $t->get( 'Version' ) );
		}
	}
	return array( '', '' );
}

/** Copy a folder's files into another, creating folders as needed. Returns false on the first failure. */
function wor_copy_tree( $from, $to ) {
	if ( ! is_dir( $to ) && ! wp_mkdir_p( $to ) ) {
		return false;
	}
	foreach ( scandir( $from ) as $f ) {
		if ( '.' === $f || '..' === $f ) {
			continue;
		}
		$a = $from . '/' . $f;
		$b = $to . '/' . $f;
		if ( is_dir( $a ) ) {
			if ( ! wor_copy_tree( $a, $b ) ) {
				return false;
			}
		} else {
			if ( file_exists( $b ) && md5_file( $a ) === md5_file( $b ) ) {
				continue;
			}
			if ( ! @copy( $a, $b ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors
				return false;
			}
			if ( function_exists( 'opcache_invalidate' ) && '.php' === substr( $b, -4 ) ) {
				@opcache_invalidate( $b, true ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			}
		}
	}
	return true;
}

/** Install or update the theme from the copy inside the plugin, when the plugin's copy is newer. */
function wor_sync_theme() {
	$src = WOR_DIR . 'theme';
	if ( ! is_dir( $src ) ) {
		return;
	}
	$bundled = get_file_data( $src . '/style.css', array( 'Version' => 'Version' ) );
	$bundled = (string) $bundled['Version'];
	if ( get_option( 'wor_theme_synced' ) === $bundled ) {
		return;
	}
	list( $dir, $version ) = wor_installed_theme_dir();
	if ( '' === $dir ) {
		$dir = get_theme_root() . '/world-on-rotation-theme';
	}
	if ( '' === $version || version_compare( $bundled, $version, '>' ) ) {
		if ( ! wor_copy_tree( $src, $dir ) ) {
			return; // Try again on the next request.
		}
		if ( function_exists( 'wp_clean_themes_cache' ) ) {
			wp_clean_themes_cache();
		}
	}
	update_option( 'wor_theme_synced', $bundled );
	wor_purge_caches();
}

/** Clear page caches after an update, so visitors get the new version straight away. */
function wor_purge_caches() {
	do_action( 'litespeed_purge_all' );                 // LiteSpeed Cache, used by Hostinger
	if ( function_exists( 'wp_cache_flush' ) ) {
		wp_cache_flush();                                // object cache
	}
	if ( has_action( 'hostinger_purge_all_cache' ) ) {
		do_action( 'hostinger_purge_all_cache' );
	}
}
add_action( 'init', 'wor_sync_theme', 5 );
