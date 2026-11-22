<?php
/**
 * A mix or playlist: the boarding pass.
 */
get_header();
if ( wort_need_plugin() ) :
	$wort_d    = wor_data();
	$wort_slug = get_post_field( 'post_name', get_queried_object_id() );
	$wort_p    = null;
	foreach ( $wort_d['P'] as $wort_x ) {
		if ( $wort_x['slug'] === $wort_slug ) {
			$wort_p = $wort_x;
		}
	}
	if ( ! $wort_p ) :
		?>
		<div class="intro-block"><p class="eyebrow">Boarding pass</p><h1><?php the_title(); ?></h1>
		<p class="lede">This mix or playlist is not live yet. It appears here once it has a place and a selector and has been published.</p></div>
		<?php
	else :
		$wort_comp  = $wort_d['C'][ $wort_p['by'] ];
		$wort_c     = $wort_d['CITY'][ $wort_p['city'] ];
		$wort_same  = array_filter( $wort_c['items'], function ( $x ) use ( $wort_p ) { return $x['id'] !== $wort_p['id']; } );
		$wort_mine  = array_slice( array_values( array_filter( $wort_d['P'], function ( $x ) use ( $wort_p ) { return $x['by'] === $wort_p['by'] && $x['id'] !== $wort_p['id']; } ) ), 0, 6 );
		$wort_first = explode( ' ', $wort_comp['name'] )[0];
		?>
<article class="sheet pass-sheet">
	<div class="sheet-top"><span>Boarding pass</span><span>Flight <?php echo esc_html( wort_flight( $wort_p ) ); ?></span></div>
	<div class="pass-head">
		<?php echo wort_pstamp( $wort_p, 150 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<div class="pass-text">
			<p class="kicker"><a href="<?php echo esc_url( $wort_c['url'] ); ?>"><?php echo esc_html( $wort_p['city'] ); ?></a> · <?php echo esc_html( $wort_p['country'] ); ?></p>
			<h1><?php echo esc_html( $wort_p['title'] ); ?></h1>
			<dl class="fields">
				<div><dt>Captain</dt><dd><a href="<?php echo esc_url( $wort_comp['url'] ); ?>"><?php echo esc_html( $wort_comp['name'] ); ?></a></dd></div>
				<div><dt>Destination</dt><dd><?php echo esc_html( $wort_c['code'] . ' · ' . $wort_p['city'] ); ?></dd></div>
				<div><dt>Flight time</dt><dd><?php echo esc_html( wort_dur( $wort_p['dur'] ) ); ?></dd></div>
				<div><dt>Tracks</dt><dd><?php echo (int) $wort_p['tracks']; ?></dd></div>
				<div><dt>Issued</dt><dd><?php echo esc_html( wort_datel( $wort_p['added'] ) ); ?></dd></div>
			</dl>
			<p class="chips"><?php foreach ( $wort_p['genres'] as $wort_g ) { echo '<span class="chip">' . esc_html( $wort_g ) . '</span>'; } ?></p>
		</div>
	</div>
	<p class="lede"><?php echo esc_html( $wort_p['desc'] ); ?></p>
	<?php echo wort_player( $wort_p ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	<p class="actions"><a class="btn primary" href="<?php echo esc_url( home_url( '/#city-' . $wort_c['slug'] ) ); ?>">See <?php echo esc_html( $wort_p['city'] ); ?> on the globe</a><a class="btn" href="<?php echo esc_url( $wort_c['url'] ); ?>">The sound of <?php echo esc_html( $wort_p['city'] ); ?></a><a class="btn" href="<?php echo esc_url( $wort_comp['url'] ); ?>">More from <?php echo esc_html( $wort_first ); ?></a></p>
</article>
		<?php if ( $wort_same ) : ?>
<section><h2>More from <?php echo esc_html( $wort_p['city'] ); ?></h2><div class="cards"><?php foreach ( $wort_same as $wort_x ) { echo wort_card( $wort_x, wort_selector_name( $wort_x['by'] ) ); } // phpcs:ignore ?></div></section>
		<?php endif; ?>
		<?php if ( $wort_mine ) : ?>
<section><h2>More from <?php echo esc_html( $wort_comp['name'] ); ?></h2><div class="cards"><?php foreach ( $wort_mine as $wort_x ) { echo wort_card( $wort_x, $wort_x['city'] ); } // phpcs:ignore ?></div></section>
		<?php endif; ?>
		<?php
	endif;
endif;
get_footer();
