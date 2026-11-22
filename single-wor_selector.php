<?php
/**
 * A selector: the passport data page.
 */
get_header();
if ( wort_need_plugin() ) :
	$wort_d    = wor_data();
	$wort_slug = get_post_field( 'post_name', get_queried_object_id() );
	$wort_comp = isset( $wort_d['C'][ $wort_slug ] ) ? $wort_d['C'][ $wort_slug ] : null;
	if ( $wort_comp ) :
		$wort_mine   = array_values( array_filter( $wort_d['P'], function ( $x ) use ( $wort_slug ) { return $x['by'] === $wort_slug; } ) );
		$wort_cities = array_unique( array_map( function ( $x ) { return $x['city']; }, $wort_mine ) );
		$wort_total  = array_sum( array_map( function ( $x ) { return $x['dur']; }, $wort_mine ) );
		$wort_since  = $wort_mine ? min( array_map( function ( $x ) { return $x['added']; }, $wort_mine ) ) : get_the_date( 'Y-m-d' );
		$wort_init   = '';
		foreach ( preg_split( '/\s+/', $wort_comp['name'] ) as $wort_w ) {
			$wort_init .= function_exists( 'mb_substr' ) ? mb_substr( $wort_w, 0, 1 ) : substr( $wort_w, 0, 1 );
		}
		$wort_init = function_exists( 'mb_substr' ) ? mb_strtoupper( mb_substr( $wort_init, 0, 2 ) ) : strtoupper( substr( $wort_init, 0, 2 ) );
		$wort_no   = 'RP' . ( wort_hash( $wort_slug ) % 9000000 + 1000000 );
		?>
<article class="sheet datapage">
	<div class="sheet-top"><span>Rhythm Passport · Selector</span><span><?php echo esc_html( $wort_no ); ?></span></div>
	<div class="dp">
		<div class="dp-photo<?php echo $wort_comp['photo'] ? ' has-img' : ''; ?>" aria-hidden="true"><?php echo $wort_comp['photo'] ? '<img src="' . esc_url( $wort_comp['photo'] ) . '" alt="">' : esc_html( $wort_init ); ?></div>
		<dl class="fields dp-fields">
			<div class="dp-name"><dt>Selector</dt><dd><?php echo esc_html( $wort_comp['name'] ); ?></dd></div>
			<div><dt>Based in</dt><dd><?php echo esc_html( $wort_comp['base'] ); ?></dd></div>
			<?php if ( ! empty( $wort_comp['nationality'] ) ) : ?><div><dt>Nationality</dt><dd><?php echo esc_html( $wort_comp['nationality'] ); ?></dd></div><?php endif; ?>
			<div><dt>Selector since</dt><dd><?php echo esc_html( wort_datel( $wort_since ) ); ?></dd></div>
			<div><dt>Role</dt><dd><?php echo esc_html( $wort_comp['role'] ); ?></dd></div>
			<div><dt>Issued by</dt><dd>Rhythm Passport<?php echo $wort_comp['sample'] ? ' · sample profile' : ''; ?></dd></div>
		</dl>
	</div>
	<p class="lede"><?php echo esc_html( $wort_comp['bio'] ); ?></p>
	<p class="meta"><?php echo esc_html( wort_plural( count( $wort_mine ), 'mix or playlist', 'mixes and playlists' ) . ' · ' . wort_plural( count( $wort_cities ), 'place', 'places' ) . ' · ' . wort_dur( $wort_total ) . ' of music' ); ?></p>
	<p class="actions">
		<?php foreach ( $wort_comp['links'] as $wort_l ) : ?>
			<?php if ( preg_match( '#^https?://#', (string) $wort_l[1] ) ) : ?><a class="btn" href="<?php echo esc_url( $wort_l[1] ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $wort_l[0] ); ?> ↗</a><?php endif; ?>
		<?php endforeach; ?>
		<a class="btn" href="<?php echo esc_url( home_url( '/#compiler-' . $wort_slug ) ); ?>">Profile on the globe</a>
	</p>
</article>
		<?php if ( $wort_mine ) : ?>
<section><h2>Stamps: mixes and playlists on the map</h2><div class="stamps">
			<?php foreach ( $wort_mine as $wort_x ) : ?>
	<a class="stampcard" href="<?php echo esc_url( $wort_x['url'] ); ?>"><?php echo wort_pstamp( $wort_x, 120 ); // phpcs:ignore ?><small><strong><?php echo esc_html( $wort_x['title'] ); ?></strong><br><?php echo esc_html( $wort_x['city'] . ' · ' . wort_dur( $wort_x['dur'] ) ); ?></small></a>
			<?php endforeach; ?>
</div></section>
		<?php endif; ?>
		<?php
	endif;
endif;
get_footer();
