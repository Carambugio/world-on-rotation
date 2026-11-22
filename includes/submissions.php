<?php
/**
 * Invitation-only submissions.
 *
 * Editors create personal invite links under Selectors → Invites. Only a valid link opens the
 * form on the "Submit a mix" page. A submission creates the mix (and, for new people, the
 * selector profile) as Pending, attaches the photo and emails the editor. Nothing goes live
 * until an editor publishes it. Submitters never get an account or see the dashboard.
 *
 * @package World_On_Rotation
 */

defined( 'ABSPATH' ) || exit;

const WOR_INVITE_DAYS = 30;
const WOR_PHOTO_MAX   = 2097152; // 2 MB.

/* ---------- Selector photos and nationality ---------- */

add_action( 'init', function () {
	add_post_type_support( 'wor_selector', 'thumbnail' );
}, 20 );
add_action( 'after_setup_theme', function () {
	add_theme_support( 'post-thumbnails', array( 'wor_selector' ) );
}, 20 );

/* ---------- Invites ---------- */

function wor_invites() {
	return (array) get_option( 'wor_invites', array() );
}

function wor_save_invites( $inv ) {
	update_option( 'wor_invites', $inv, false );
}

/** The invite for a token, with its status: valid, used, expired, cancelled or unknown. */
function wor_invite( $token ) {
	$token = preg_replace( '/[^A-Za-z0-9]/', '', (string) $token );
	$all   = wor_invites();
	if ( '' === $token || ! isset( $all[ $token ] ) ) {
		return array( null, 'unknown' );
	}
	$i = $all[ $token ];
	if ( ! empty( $i['cancelled'] ) ) {
		return array( $i, 'cancelled' );
	}
	if ( empty( $i['reusable'] ) && ! empty( $i['used'] ) ) {
		return array( $i, 'used' );
	}
	if ( empty( $i['reusable'] ) && time() > (int) $i['expires'] ) {
		return array( $i, 'expired' );
	}
	return array( $i, 'valid' );
}

function wor_invite_url( $token ) {
	return add_query_arg( 'invite', $token, home_url( '/submit/' ) );
}

/** Selectors → Invites. */
add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=wor_selector', 'Invites', 'Invites', 'edit_others_posts', 'wor-invites', 'wor_invites_page' );
} );

add_action( 'admin_post_wor_invite', function () {
	if ( ! current_user_can( 'edit_others_posts' ) || ! check_admin_referer( 'wor_invite' ) ) {
		wp_die( 'Not allowed.' );
	}
	$all = wor_invites();
	$do  = sanitize_key( wp_unslash( $_POST['do'] ?? '' ) );
	if ( 'create' === $do ) {
		$token         = wp_generate_password( 20, false, false );
		$all[ $token ] = array(
			'name'     => sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) ),
			'note'     => sanitize_text_field( wp_unslash( $_POST['note'] ?? '' ) ),
			'selector' => (int) ( $_POST['selector'] ?? 0 ),
			'reusable' => ! empty( $_POST['reusable'] ),
			'created'  => time(),
			'expires'  => time() + WOR_INVITE_DAYS * DAY_IN_SECONDS,
			'used'     => 0,
			'mixes'    => array(),
		);
		wor_save_invites( $all );
		wp_safe_redirect( admin_url( 'edit.php?post_type=wor_selector&page=wor-invites&new=' . $token ) );
		exit;
	}
	$token = preg_replace( '/[^A-Za-z0-9]/', '', (string) wp_unslash( $_POST['token'] ?? '' ) );
	if ( isset( $all[ $token ] ) ) {
		if ( 'cancel' === $do ) {
			$all[ $token ]['cancelled'] = time();
		} elseif ( 'delete' === $do ) {
			unset( $all[ $token ] );
		}
		wor_save_invites( $all );
	}
	wp_safe_redirect( admin_url( 'edit.php?post_type=wor_selector&page=wor-invites' ) );
	exit;
} );

function wor_invites_page() {
	$all  = wor_invites();
	$new  = isset( $_GET['new'] ) ? preg_replace( '/[^A-Za-z0-9]/', '', (string) wp_unslash( $_GET['new'] ) ) : '';
	$sels = get_posts( array( 'post_type' => 'wor_selector', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC', 'post_status' => 'publish' ) );
	?>
	<div class="wrap">
		<h1>Invites</h1>
		<p>Only people with an invite link can open the submission form. Each link works for one submission and expires after <?php echo (int) WOR_INVITE_DAYS; ?> days, unless you make it reusable. Everything they send waits as Pending until you publish it.</p>
		<?php if ( $new && isset( $all[ $new ] ) ) : ?>
		<div class="notice notice-success"><p><strong>Invite created for <?php echo esc_html( $all[ $new ]['name'] ); ?>.</strong> Send them this link:</p>
			<p><input type="text" class="large-text code" readonly value="<?php echo esc_attr( wor_invite_url( $new ) ); ?>" onclick="this.select()"></p>
			<p><button type="button" class="button" onclick="var i=this.parentNode.previousElementSibling.firstElementChild;i.select();navigator.clipboard&&navigator.clipboard.writeText(i.value);this.textContent='Copied'">Copy link</button></p></div>
		<?php endif; ?>

		<h2>New invite</h2>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'wor_invite' ); ?>
			<input type="hidden" name="action" value="wor_invite"><input type="hidden" name="do" value="create">
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="wor-inv-name">Who is it for?</label></th><td><input name="name" id="wor-inv-name" type="text" class="regular-text" required placeholder="Name or alias"></td></tr>
				<tr><th scope="row"><label for="wor-inv-sel">Already on the site?</label></th><td><select name="selector" id="wor-inv-sel"><option value="0">No, a new selector</option><?php foreach ( $sels as $s ) : ?><option value="<?php echo (int) $s->ID; ?>"><?php echo esc_html( $s->post_title ); ?></option><?php endforeach; ?></select>
					<p class="description">Pick their profile and the form skips the profile questions; the mix goes straight under their name.</p></td></tr>
				<tr><th scope="row">Reusable</th><td><label><input type="checkbox" name="reusable" value="1"> Keep the link working for every new mix (for regulars)</label></td></tr>
				<tr><th scope="row"><label for="wor-inv-note">Note</label></th><td><input name="note" id="wor-inv-note" type="text" class="regular-text" placeholder="Optional, only you see it"></td></tr>
			</table>
			<?php submit_button( 'Create invite link' ); ?>
		</form>

		<h2>All invites</h2>
		<?php if ( ! $all ) : ?>
		<p>No invites yet.</p>
		<?php else : ?>
		<table class="widefat striped">
			<thead><tr><th>For</th><th>Link</th><th>Status</th><th>Created</th><th>Submitted</th><th></th></tr></thead>
			<tbody>
			<?php
			uasort( $all, function ( $a, $b ) { return $b['created'] <=> $a['created']; } );
			foreach ( $all as $token => $i ) :
				list( , $status ) = wor_invite( $token );
				$label = array( 'valid' => $i['reusable'] ? 'Active (reusable)' : 'Waiting, expires ' . date_i18n( 'j M', $i['expires'] ), 'used' => 'Used', 'expired' => 'Expired', 'cancelled' => 'Cancelled' )[ $status ] ?? $status;
				?>
				<tr>
					<td><strong><?php echo esc_html( $i['name'] ); ?></strong><?php echo $i['note'] ? '<br><small>' . esc_html( $i['note'] ) . '</small>' : ''; ?></td>
					<td><input type="text" class="code" style="width:100%;max-width:420px" readonly value="<?php echo esc_attr( wor_invite_url( $token ) ); ?>" onclick="this.select()"></td>
					<td><?php echo esc_html( $label ); ?></td>
					<td><?php echo esc_html( date_i18n( 'j M Y', $i['created'] ) ); ?></td>
					<td><?php
					foreach ( (array) $i['mixes'] as $mid ) {
						echo '<a href="' . esc_url( get_edit_post_link( $mid ) ) . '">' . esc_html( get_the_title( $mid ) ?: '(mix)' ) . '</a><br>';
					}
					?></td>
					<td>
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline">
							<?php wp_nonce_field( 'wor_invite' ); ?><input type="hidden" name="action" value="wor_invite"><input type="hidden" name="token" value="<?php echo esc_attr( $token ); ?>">
							<?php if ( 'valid' === $status ) : ?><button class="button-link" name="do" value="cancel">Cancel</button> · <?php endif; ?>
							<button class="button-link" name="do" value="delete">Delete</button>
						</form>
					</td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<?php endif; ?>
	</div>
	<?php
}

/* ---------- The form ---------- */

/** Keep the submission page out of search engines. */
add_filter( 'wp_robots', function ( $r ) {
	if ( is_page( 'submit' ) ) {
		$r['noindex']  = true;
		$r['nofollow'] = true;
	}
	return $r;
} );

/** Turn a pasted link into a "Label | link" line for the profile. */
function wor_link_line( $url ) {
	$url = esc_url_raw( trim( $url ) );
	if ( ! $url || ! preg_match( '#^https?://#', $url ) ) {
		return '';
	}
	$host  = preg_replace( '/^www\./', '', strtolower( (string) wp_parse_url( $url, PHP_URL_HOST ) ) );
	$names = array( 'mixcloud.com' => 'Mixcloud', 'soundcloud.com' => 'SoundCloud', 'instagram.com' => 'Instagram', 'open.spotify.com' => 'Spotify', 'bandcamp.com' => 'Bandcamp', 'youtube.com' => 'YouTube', 'facebook.com' => 'Facebook', 'x.com' => 'X', 'twitter.com' => 'X', 'tiktok.com' => 'TikTok', 'nts.live' => 'NTS', 'linktr.ee' => 'Linktree' );
	$label = 'Website';
	foreach ( $names as $h => $n ) {
		if ( $host === $h || substr( $host, -strlen( '.' . $h ) ) === '.' . $h ) {
			$label = $n;
		}
	}
	return $label . ' | ' . $url;
}

/** Existing place for "City, Country" text (0 if none). */
function wor_match_place( $text ) {
	$city = trim( strtok( (string) $text, ',' ) );
	if ( '' === $city ) {
		return 0;
	}
	$p = get_page_by_path( wor_slugify( $city ), OBJECT, 'wor_place' );
	return $p && 'publish' === $p->post_status ? (int) $p->ID : 0;
}

function wor_field( $name, $label, $attrs = '', $help = '', $type = 'text', $value = '' ) {
	$id = 'wor-f-' . $name;
	$in = 'textarea' === $type
		? '<textarea id="' . $id . '" name="' . $name . '" ' . $attrs . '>' . esc_textarea( $value ) . '</textarea>'
		: '<input id="' . $id . '" name="' . $name . '" type="' . $type . '" value="' . esc_attr( $value ) . '" ' . $attrs . '>';
	return '<p class="wf"><label for="' . $id . '">' . esc_html( $label ) . '</label>' . $in . ( $help ? '<small>' . esc_html( $help ) . '</small>' : '' ) . '</p>';
}

add_shortcode( 'wor_submit', function () {
	$token = isset( $_REQUEST['invite'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['invite'] ) ) : '';
	list( $inv, $status ) = wor_invite( $token );

	if ( isset( $_GET['sent'] ) ) {
		return wor_form_css() . '<div class="wform done"><h2>Thank you, your mix is on its way.</h2><p>We will listen, check the details and let you know when it is on the globe. Nothing is published until we have looked at it.</p>' . ( 'valid' === $status ? '<p><a class="btn" href="' . esc_url( wor_invite_url( $token ) ) . '">Send another mix</a></p>' : '' ) . '</div>';
	}
	if ( 'valid' !== $status ) {
		$msg = array(
			'used'      => 'This invite link has already been used. If you would like to send another mix, ask us for a new link.',
			'expired'   => 'This invite link has expired. Ask us for a new one and we will send it over.',
			'cancelled' => 'This invite link is no longer active.',
		);
		return wor_form_css() . '<div class="wform closed"><p>' . esc_html( $msg[ $status ] ?? 'World on Rotation takes submissions by invitation. If you make mixes or playlists rooted in a place and would like to be on the globe, get in touch through the About page.' ) . '</p></div>';
	}

	$err  = isset( $_GET['err'] ) ? sanitize_text_field( wp_unslash( $_GET['err'] ) ) : '';
	$sel  = ! empty( $inv['selector'] ) ? get_post( (int) $inv['selector'] ) : null;
	$out  = wor_form_css();
	$out .= '<form class="wform" method="post" enctype="multipart/form-data" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	$out .= wp_nonce_field( 'wor_submit', '_wornonce', true, false );
	$out .= '<input type="hidden" name="action" value="wor_submit"><input type="hidden" name="invite" value="' . esc_attr( $token ) . '">';
	$out .= '<p class="hp" aria-hidden="true"><label>Leave this empty <input type="text" name="website_url" tabindex="-1" autocomplete="off"></label></p>';
	if ( $err ) {
		$out .= '<p class="werr" role="alert">' . esc_html( $err ) . '</p>';
	}
	if ( $sel ) {
		$out .= '<p class="as">Sending as <strong>' . esc_html( $sel->post_title ) . '</strong>.</p>';
	} else {
		$out .= '<fieldset><legend>About you</legend>';
		$out .= wor_field( 'alias', 'Name or alias', 'required maxlength="80" autocomplete="nickname"', 'How you want to appear on the site.', 'text', $inv['name'] ?? '' );
		$out .= wor_field( 'fullname', 'Full name', 'maxlength="80" autocomplete="name"', 'Optional. Only if it differs from the name above and you want it shown.' );
		$out .= wor_field( 'email', 'Email', 'required maxlength="120" autocomplete="email"', 'So we can tell you when your mix is live. Never shown on the site.', 'email' );
		$out .= wor_field( 'nationality', 'Nationality', 'maxlength="60"' );
		$out .= wor_field( 'base', 'Based in', 'required maxlength="80"', 'City and country, for example Lagos, Nigeria.' );
		$out .= wor_field( 'role', 'What you do', 'maxlength="80"', 'For example: DJ and record collector, radio host, label owner.' );
		$out .= wor_field( 'bio', 'Short bio', 'required maxlength="800" rows="5"', 'Up to 800 characters.', 'textarea' );
		$out .= wor_field( 'links', 'Your links', 'maxlength="1200" rows="4" placeholder="https://www.mixcloud.com/yourname/&#10;https://www.instagram.com/yourname/"', 'One per line: Mixcloud, Instagram, website, Bandcamp and so on.', 'textarea' );
		$out .= '<p class="wf"><label for="wor-f-photo">Photo or logo</label><input id="wor-f-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG or WebP, up to 2 MB. Square works best.</small></p>';
		$out .= '</fieldset>';
	}
	$out .= '<fieldset><legend>Your mix</legend>';
	$out .= wor_field( 'title', 'Title', 'required maxlength="120"' );
	$out .= wor_field( 'audio', 'Download link for the audio file', 'required maxlength="500" placeholder="https://wetransfer.com/…"', 'WeTransfer, Dropbox, Google Drive or similar. WAV, or MP3 at 320 kbps, at least 15 minutes long. We upload it to the World on Rotation Mixcloud, credited to you. A playlist works too: put the tracks back to back in one file.', 'url' );
	$out .= wor_field( 'tracklist', 'Tracklist', 'required maxlength="4000" rows="8" placeholder="Artist – Title&#10;Artist – Title"', 'One track per line, in order. Mixcloud uses it to pay the artists.', 'textarea' );
	$out .= wor_field( 'place', 'The place it belongs to', 'required maxlength="80"', 'Where the music comes from, which is not always where you live: a city, town, region or country. For example: Ségou, Mali.' );
	$out .= wor_field( 'genres', 'Styles', 'maxlength="120"', 'Optional, separated by commas.' );
	$out .= wor_field( 'desc', 'Description', 'required maxlength="600" rows="4"', 'A few lines on what it is and why. Up to 600 characters.', 'textarea' );
	$out .= '</fieldset>';
	$out .= '<p class="wf check"><label><input type="checkbox" name="consent" value="1" required><span>I made this mix and have the right to share it and the photo. I agree that World on Rotation can publish the mix on its Mixcloud and on this site, credited to me, and keep my details as described in the <a href="' . esc_url( home_url( '/privacy-policy/' ) ) . '" target="_blank">privacy policy</a>.</span></label></p>';
	$out .= '<p><button class="btn primary" type="submit">Send it</button></p></form>';
	return $out;
} );

function wor_form_css() {
	static $done = false;
	if ( $done ) {
		return '';
	}
	$done = true;
	return '<style>
.wform{display:flex;flex-direction:column;gap:18px;max-width:640px;margin-top:8px}
.wform fieldset{border:1px solid var(--line,rgba(255,255,255,.13));border-radius:16px;padding:18px 18px 6px;margin:0;display:flex;flex-direction:column;gap:14px;min-width:0}
.wform legend{padding:0 8px;font-family:var(--f-mono,monospace);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent,#f0b45e)}
.wform .wf{display:flex;flex-direction:column;gap:6px;margin:0}
.wform label{font-weight:600;font-size:14px}
.wform small{color:var(--muted,rgba(243,238,228,.66));font-size:12.5px}
.wform input[type=text],.wform input[type=email],.wform input[type=url],.wform textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,.05);border:1px solid var(--line,rgba(255,255,255,.18));border-radius:10px;color:inherit;font:inherit;font-size:15px;padding:10px 12px}
.wform input:focus,.wform textarea:focus{outline:2px solid var(--accent,#f0b45e);outline-offset:1px}
.wform input[type=file]{font-size:13px;color:var(--muted,#ccc)}
.wform .check label{font-weight:400;font-size:13.5px;display:flex;gap:10px;align-items:flex-start}
.wform .check input{margin-top:4px;flex:none}
.wform .hp{position:absolute!important;left:-9999px!important;height:1px;overflow:hidden}
.wform .werr{border:1px solid #e0705e;background:rgba(224,112,94,.12);border-radius:10px;padding:10px 14px;margin:0}
.wform .as{margin:0}
.wform.done h2{margin-bottom:6px}
</style>';
}

/* ---------- Handling a submission ---------- */

function wor_submit_back( $token, $err ) {
	wp_safe_redirect( add_query_arg( array( 'invite' => $token, 'err' => rawurlencode( $err ) ), home_url( '/submit/' ) ) . '#wor-f-title' );
	exit;
}

function wor_handle_submit() {
	$token = sanitize_text_field( wp_unslash( $_POST['invite'] ?? '' ) );
	list( $inv, $status ) = wor_invite( $token );
	if ( 'valid' !== $status || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_wornonce'] ?? '' ) ), 'wor_submit' ) ) {
		wp_safe_redirect( home_url( '/submit/' ) );
		exit;
	}
	// Bots fill in the hidden field.
	if ( ! empty( $_POST['website_url'] ) ) {
		wp_safe_redirect( add_query_arg( array( 'invite' => $token, 'sent' => 1 ), home_url( '/submit/' ) ) );
		exit;
	}
	// At most five submissions an hour from one connection.
	$ipkey = 'wor_sub_' . md5( (string) ( $_SERVER['REMOTE_ADDR'] ?? '' ) . wp_salt() );
	$count = (int) get_transient( $ipkey );
	if ( $count >= 5 ) {
		wor_submit_back( $token, 'Too many submissions in a short time. Please try again in an hour.' );
	}

	$p = function ( $k, $max ) {
		$v = isset( $_POST[ $k ] ) ? sanitize_textarea_field( wp_unslash( $_POST[ $k ] ) ) : '';
		return function_exists( 'mb_substr' ) ? trim( mb_substr( $v, 0, $max ) ) : trim( substr( $v, 0, $max ) );
	};
	$title  = $p( 'title', 120 );
	$audio  = esc_url_raw( $p( 'audio', 500 ) );
	$tracks = $p( 'tracklist', 4000 );
	$place  = $p( 'place', 80 );
	$desc   = $p( 'desc', 600 );
	$genres = $p( 'genres', 120 );
	if ( '' === $title || '' === $place || '' === $desc ) {
		wor_submit_back( $token, 'Please fill in the title, the place and the description of your mix.' );
	}
	if ( ! preg_match( '#^https?://#', $audio ) ) {
		wor_submit_back( $token, 'Please add a download link for the audio file, for example from WeTransfer, Dropbox or Google Drive.' );
	}
	if ( '' === $tracks ) {
		wor_submit_back( $token, 'Please add the tracklist.' );
	}
	if ( empty( $_POST['consent'] ) ) {
		wor_submit_back( $token, 'Please tick the box at the end to confirm you can share this.' );
	}

	$selector_id = ! empty( $inv['selector'] ) ? (int) $inv['selector'] : 0;
	$new_sel     = false;
	$email       = '';
	if ( ! $selector_id ) {
		$alias = $p( 'alias', 80 );
		$email = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
		$base  = $p( 'base', 80 );
		$bio   = $p( 'bio', 800 );
		if ( '' === $alias || '' === $base || '' === $bio || ! is_email( $email ) ) {
			wor_submit_back( $token, 'Please fill in your name or alias, a valid email, where you are based and a short bio.' );
		}
		// Check the photo before saving anything.
		$has_photo = ! empty( $_FILES['photo']['name'] ) && UPLOAD_ERR_NO_FILE !== (int) $_FILES['photo']['error'];
		if ( $has_photo ) {
			$ft = wp_check_filetype_and_ext( $_FILES['photo']['tmp_name'], $_FILES['photo']['name'] );
			if ( UPLOAD_ERR_OK !== (int) $_FILES['photo']['error'] || (int) $_FILES['photo']['size'] > WOR_PHOTO_MAX || ! in_array( $ft['type'], array( 'image/jpeg', 'image/png', 'image/webp' ), true ) ) {
				wor_submit_back( $token, 'The photo needs to be a JPG, PNG or WebP file under 2 MB.' );
			}
		}
		$lines = array();
		foreach ( preg_split( '/\R/', $p( 'links', 1200 ) ) as $l ) {
			$line = wor_link_line( $l );
			if ( $line && count( $lines ) < 8 ) {
				$lines[] = $line;
			}
		}
		$GLOBALS['wor_submitting'] = true;
		$selector_id               = wp_insert_post( array(
			'post_type'    => 'wor_selector',
			'post_status'  => 'pending',
			'post_title'   => $alias,
			'post_content' => $bio,
		) );
		if ( ! $selector_id || is_wp_error( $selector_id ) ) {
			wor_submit_back( $token, 'Something went wrong saving your details. Please try again.' );
		}
		$new_sel = true;
		update_post_meta( $selector_id, '_wor_base', $base );
		update_post_meta( $selector_id, '_wor_role', $p( 'role', 80 ) );
		update_post_meta( $selector_id, '_wor_links', implode( "\n", $lines ) );
		update_post_meta( $selector_id, '_wor_nationality', $p( 'nationality', 60 ) );
		update_post_meta( $selector_id, '_wor_fullname', $p( 'fullname', 80 ) );
		update_post_meta( $selector_id, '_wor_email', $email );
		update_post_meta( $selector_id, '_wor_submitted', 1 );
		if ( $has_photo ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/media.php';
			require_once ABSPATH . 'wp-admin/includes/image.php';
			$att = media_handle_upload( 'photo', $selector_id, array( 'post_title' => $alias ), array( 'test_form' => false ) );
			if ( ! is_wp_error( $att ) ) {
				set_post_thumbnail( $selector_id, $att );
			}
		}
	}

	$GLOBALS['wor_submitting'] = true;
	$mix_id                    = wp_insert_post( array(
		'post_type'    => 'wor_mix',
		'post_status'  => 'pending',
		'post_title'   => $title,
		'post_content' => $desc,
	) );
	if ( ! $mix_id || is_wp_error( $mix_id ) ) {
		wor_submit_back( $token, 'Something went wrong saving your mix. Please try again.' );
	}
	update_post_meta( $mix_id, '_wor_audio', $audio );
	update_post_meta( $mix_id, '_wor_tracklist', $tracks );
	update_post_meta( $mix_id, '_wor_selector', (string) $selector_id );
	update_post_meta( $mix_id, '_wor_genres', $genres );
	update_post_meta( $mix_id, '_wor_added', current_time( 'Y-m-d' ) );
	update_post_meta( $mix_id, '_wor_submitted', 1 );
	$place_id = wor_match_place( $place );
	if ( $place_id ) {
		update_post_meta( $mix_id, '_wor_place', (string) $place_id );
	} else {
		update_post_meta( $mix_id, '_wor_new_place', $place );
	}

	// Record it on the invite.
	$all = wor_invites();
	$all[ $token ]['used']    = time();
	$all[ $token ]['mixes'][] = $mix_id;
	wor_save_invites( $all );
	set_transient( $ipkey, $count + 1, HOUR_IN_SECONDS );

	// Tell the editor.
	$to   = get_option( 'wor_contact_email' ) ?: get_option( 'admin_email' );
	$body = sprintf( "%s has sent a mix for World on Rotation.\n\nMix: %s\nAudio file: %s\n(Download it soon: transfer links expire.)\nPlace: %s%s\n\nUpload it to the World on Rotation Mixcloud, paste the Mixcloud link into the mix, then publish:\n%s\n",
		get_the_title( $selector_id ), $title, $audio, $place, $place_id ? '' : ' (new place: add it under Places, then pick it on the mix)',
		admin_url( 'post.php?post=' . $mix_id . '&action=edit' ) );
	if ( $new_sel ) {
		$body .= sprintf( "\nThis is a new selector. Their profile is pending too (it is published automatically with the mix):\n%s\nEmail: %s\n", admin_url( 'post.php?post=' . $selector_id . '&action=edit' ), $email );
	}
	wp_mail( $to, 'New submission: ' . $title, $body );

	wp_safe_redirect( add_query_arg( array( 'invite' => $token, 'sent' => 1 ), home_url( '/submit/' ) ) );
	exit;
}
add_action( 'admin_post_nopriv_wor_submit', 'wor_handle_submit' );
add_action( 'admin_post_wor_submit', 'wor_handle_submit' );

/** Publishing a submitted mix also publishes its pending selector profile. */
add_action( 'transition_post_status', function ( $new, $old, $post ) {
	if ( 'wor_mix' !== $post->post_type || 'publish' !== $new || 'publish' === $old ) {
		return;
	}
	$sid = (int) get_post_meta( $post->ID, '_wor_selector', true );
	if ( $sid && 'pending' === get_post_status( $sid ) ) {
		wp_update_post( array( 'ID' => $sid, 'post_status' => 'publish' ) );
	}
}, 20, 3 );

/** A mix cannot go live without a player: keep it pending and say why. */
add_filter( 'wp_insert_post_data', function ( $data, $raw ) {
	if ( 'wor_mix' !== $data['post_type'] || 'publish' !== $data['post_status'] || empty( $raw['ID'] ) ) {
		return $data;
	}
	$id  = (int) $raw['ID'];
	$has = function ( $k ) use ( $id ) {
		// phpcs:ignore WordPress.Security.NonceVerification -- the fields box checks its own nonce when saving.
		$v = isset( $_POST[ 'wor_' . $k ] ) ? trim( (string) wp_unslash( $_POST[ 'wor_' . $k ] ) ) : (string) get_post_meta( $id, '_wor_' . $k, true );
		return '' !== $v;
	};
	if ( ! $has( 'mixcloud' ) && ! $has( 'spotify' ) ) {
		$data['post_status'] = 'pending';
		set_transient( 'wor_nolink_' . get_current_user_id(), 1, 60 );
	}
	return $data;
}, 10, 2 );

add_action( 'admin_notices', function () {
	if ( get_transient( 'wor_nolink_' . get_current_user_id() ) ) {
		delete_transient( 'wor_nolink_' . get_current_user_id() );
		echo '<div class="notice notice-error"><p><strong>Not published yet.</strong> Add the Mixcloud link first: upload the audio file to the World on Rotation Mixcloud, paste the link into the mix, then publish.</p></div>';
	}
} );
