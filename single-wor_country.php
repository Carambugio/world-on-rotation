<?php
/**
 * A country guide.
 */
get_header();
if ( wort_need_plugin() ) :
	$wort_d     = wor_data();
	$wort_name  = single_post_title( '', false );
	$wort_g     = isset( $wort_d['CGUIDE'][ $wort_name ] ) ? $wort_d['CGUIDE'][ $wort_name ] : null;
	$wort_the   = wor_the_name( $wort_name );
	$wort_pl    = array_values( array_filter( $wort_d['CITY'], function ( $c ) use ( $wort_name ) { return $c['country'] === $wort_name; } ) );
	usort( $wort_pl, function ( $a, $b ) { return count( $b['items'] ) - count( $a['items'] ); } );
	$wort_items = array();
	foreach ( $wort_pl as $wort_c ) {
		$wort_items = array_merge( $wort_items, $wort_c['items'] );
	}
	?>
<article class="sheet visa-sheet">
	<div class="sheet-top"><span>Country guide · <?php echo esc_html( wor_iso3( $wort_name ) ); ?></span><span><?php echo esc_html( wort_plural( count( $wort_pl ), 'place', 'places' ) . ' · ' . wort_plural( count( $wort_items ), 'mix or playlist', 'mixes and playlists' ) ); ?></span></div>
	<div class="visa-head"><div>
		<p class="kicker">Country guide</p>
		<h1><?php echo esc_html( $wort_name ); ?></h1>
		<p class="actions"><a class="btn primary" href="<?php echo esc_url( home_url( '/' ) ); ?>">Open the globe</a></p>
	</div></div>
</article>
	<?php if ( $wort_pl ) : ?>
<section><h2>Places in <?php echo esc_html( $wort_the ); ?></h2><div class="cards"><?php foreach ( $wort_pl as $wort_c ) { echo wort_place_card( $wort_c ); } // phpcs:ignore ?></div></section>
	<?php endif; ?>
	<?php if ( $wort_items ) : ?>
<section><h2>Mixes and playlists from <?php echo esc_html( $wort_the ); ?></h2><div class="cards"><?php foreach ( $wort_items as $wort_x ) { echo wort_card( $wort_x, wort_selector_name( $wort_x['by'] ) ); } // phpcs:ignore ?></div></section>
	<?php endif; ?>
	<?php if ( $wort_g ) : ?>
<section class="guide">
	<h2><?php echo esc_html( wort_t( 'sound_of' ) ); ?> <?php echo esc_html( $wort_the ); ?></h2>
	<?php echo wort_paras( $wort_g['map'] ); // phpcs:ignore ?>
	<div class="g-grid"><?php echo wort_glist( wort_t( 'traditions' ), $wort_g['traditions'] ); // phpcs:ignore ?></div>
	<?php echo wort_gparas( wort_t( 'eras' ), $wort_g['eras'] ) . wort_gparas( wort_t( 'diaspora' ), $wort_g['diaspora'] ) . wort_gparas( wort_t( 'now' ), $wort_g['now'] ); // phpcs:ignore ?>
	<div class="g-grid"><?php echo wort_glist( wort_t( 'dig' ), $wort_g['dig'] ) . wort_glist( wort_t( 'festivals' ), $wort_g['festivals'] ); // phpcs:ignore ?></div>
	<div class="g-grid"><?php echo wort_glist( wort_t( 'records' ), $wort_g['records'] ); // phpcs:ignore ?></div>
</section>
	<?php endif; ?>
	<?php
endif;
get_footer();
