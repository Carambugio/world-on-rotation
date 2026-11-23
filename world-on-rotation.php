<?php
/**
 * Plugin Name:       World on Rotation
 * Description:       The content behind the World on Rotation globe: mixes and playlists, selectors, places and countries, with their music guides. Includes the Selector role and a one-click import of the launch content.
 * Version:           1.6.9
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Rhythm Passport
 * Author URI:        https://rhythmpassport.com/
 * License:           GPL-2.0-or-later
 * Text Domain:       world-on-rotation
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WOR_VERSION', '1.6.9' );
define( 'WOR_DIR', plugin_dir_path( __FILE__ ) );
define( 'WOR_URL', plugin_dir_url( __FILE__ ) );

require_once WOR_DIR . 'includes/helpers.php';
require_once WOR_DIR . 'includes/post-types.php';
require_once WOR_DIR . 'includes/roles.php';
require_once WOR_DIR . 'includes/fields.php';
require_once WOR_DIR . 'includes/data.php';
require_once WOR_DIR . 'includes/import.php';
require_once WOR_DIR . 'includes/pages.php';
require_once WOR_DIR . 'includes/theme-sync.php';
require_once WOR_DIR . 'includes/submissions.php';
require_once WOR_DIR . 'includes/hardening.php';
require_once WOR_DIR . 'includes/live-sky.php';
require_once WOR_DIR . 'includes/badges.php';

/**
 * Activation: register types, set up roles, import the launch content once, refresh permalinks.
 */
function wor_activate() {
	wor_register_post_types();
	wor_setup_roles();
	if ( ! get_option( 'wor_imported' ) ) {
		wor_import_all();
	}
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'wor_activate' );

function wor_deactivate() {
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'wor_deactivate' );
