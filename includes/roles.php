<?php
/**
 * The Selector role: can add and edit their own mixes and playlists, which wait as Pending until an editor publishes them.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function wor_mix_caps_all() {
	return array(
		'edit_wor_mix', 'read_wor_mix', 'delete_wor_mix',
		'edit_wor_mixes', 'edit_others_wor_mixes', 'publish_wor_mixes', 'read_private_wor_mixes',
		'delete_wor_mixes', 'delete_private_wor_mixes', 'delete_published_wor_mixes', 'delete_others_wor_mixes',
		'edit_private_wor_mixes', 'edit_published_wor_mixes',
	);
}

function wor_setup_roles() {
	foreach ( array( 'administrator', 'editor' ) as $r ) {
		$role = get_role( $r );
		if ( $role ) {
			foreach ( wor_mix_caps_all() as $cap ) {
				$role->add_cap( $cap );
			}
		}
	}
	remove_role( 'wor_selector' );
	add_role(
		'wor_selector',
		'Selector',
		array(
			'read'             => true,
			'edit_wor_mixes'   => true,
			'delete_wor_mixes' => true,
			'upload_files'     => false,
		)
	);
}

/** Re-run when the plugin version changes (covers updates by upload). */
function wor_maybe_upgrade() {
	if ( get_option( 'wor_version' ) !== WOR_VERSION ) {
		wor_setup_roles();
		if ( get_option( 'wor_imported' ) && function_exists( 'wor_rename_countries' ) ) {
			wor_rename_countries();
		}
		if ( get_option( 'wor_imported' ) && function_exists( 'wor_import_new_bundled_countries' ) ) {
			wor_import_new_bundled_countries();
		}
		// 1.3.0 rewrote every country guide: replace the old texts once.
		if ( get_option( 'wor_imported' ) && ! get_option( 'wor_guides_130' ) && function_exists( 'wor_refresh_bundled_countries' ) ) {
			wor_refresh_bundled_countries();
			update_option( 'wor_guides_130', 1 );
		}
		if ( get_option( 'wor_imported' ) && function_exists( 'wor_sync_bundled_countries' ) ) {
			// 1.3.1 added Yunnan to the China guide; 1.3.2 put every guide in house style.
			$force = get_option( 'wor_guides_131' ) ? array() : array( 'China' );
			if ( ! get_option( 'wor_guides_132' ) ) {
				$force = array_keys( (array) wor_json( 'country_info.json' ) );
			}
			wor_sync_bundled_countries( $force );
			update_option( 'wor_guides_131', 1 );
			update_option( 'wor_guides_132', 1 );
		}
		if ( get_option( 'wor_imported' ) && function_exists( 'wor_create_pages' ) ) {
			wor_create_pages();
		}
		update_option( 'wor_version', WOR_VERSION );
		flush_rewrite_rules();
	}
}
add_action( 'init', 'wor_maybe_upgrade', 20 );

/** The selector profile a user account is linked to (0 if none). */
function wor_user_selector_id( $user_id = 0 ) {
	$user_id = $user_id ? $user_id : get_current_user_id();
	return (int) get_user_meta( $user_id, 'wor_selector_id', true );
}

/** Selectors only see their own items in the dashboard list. */
function wor_selectors_see_own( $q ) {
	if ( is_admin() && $q->is_main_query() && 'wor_mix' === $q->get( 'post_type' ) && ! current_user_can( 'edit_others_wor_mixes' ) ) {
		$q->set( 'author', get_current_user_id() );
	}
}
add_action( 'pre_get_posts', 'wor_selectors_see_own' );

/** Keep the dashboard simple for selectors. */
function wor_selector_menu() {
	if ( current_user_can( 'edit_others_wor_mixes' ) || ! current_user_can( 'edit_wor_mixes' ) ) {
		return;
	}
	remove_menu_page( 'edit.php' );
	remove_menu_page( 'edit-comments.php' );
	remove_menu_page( 'tools.php' );
}
add_action( 'admin_menu', 'wor_selector_menu', 99 );

/** Tell the site admin when a selector submits something. */
function wor_notify_pending( $new, $old, $post ) {
	if ( 'wor_mix' !== $post->post_type || 'pending' !== $new || 'pending' === $old || ! empty( $GLOBALS['wor_submitting'] ) ) {
		return;
	}
	$author = get_userdata( $post->post_author );
	wp_mail(
		get_option( 'admin_email' ),
		'New mix or playlist waiting: ' . $post->post_title,
		sprintf(
			"%s has submitted \"%s\" for World on Rotation.\n\nReview and publish it here:\n%s",
			$author ? $author->display_name : 'A selector',
			$post->post_title,
			admin_url( 'post.php?post=' . $post->ID . '&action=edit' )
		)
	);
}
add_action( 'transition_post_status', 'wor_notify_pending', 10, 3 );

/** Link a user account to a selector profile (on the user's profile screen, admins only). */
function wor_user_field( $user ) {
	if ( ! current_user_can( 'edit_users' ) ) {
		return;
	}
	$current   = wor_user_selector_id( $user->ID );
	$selectors = get_posts( array( 'post_type' => 'wor_selector', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC', 'post_status' => 'any' ) );
	wp_nonce_field( 'wor_user_selector', 'wor_user_selector_nonce' );
	echo '<h2>World on Rotation</h2><table class="form-table"><tr><th><label for="wor_selector_id">Selector profile</label></th><td><select name="wor_selector_id" id="wor_selector_id"><option value="0">None</option>';
	foreach ( $selectors as $s ) {
		printf( '<option value="%d"%s>%s</option>', (int) $s->ID, selected( $current, $s->ID, false ), esc_html( $s->post_title ) );
	}
	echo '</select><p class="description">Mixes and playlists this person submits are credited to this selector.</p></td></tr></table>';
}
add_action( 'show_user_profile', 'wor_user_field' );
add_action( 'edit_user_profile', 'wor_user_field' );

function wor_user_field_save( $user_id ) {
	if ( ! current_user_can( 'edit_users' ) || ! isset( $_POST['wor_user_selector_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['wor_user_selector_nonce'] ), 'wor_user_selector' ) ) {
		return;
	}
	if ( isset( $_POST['wor_selector_id'] ) ) {
		update_user_meta( $user_id, 'wor_selector_id', absint( $_POST['wor_selector_id'] ) );
	}
}
add_action( 'personal_options_update', 'wor_user_field_save' );
add_action( 'edit_user_profile_update', 'wor_user_field_save' );
