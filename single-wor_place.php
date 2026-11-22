<?php
/**
 * A place: the visa page and its music guide.
 */
get_header();
if ( wort_need_plugin() ) :
	$wort_d    = wor_data();
	$wort_name = single_post_title( '', false );
	$wort_c    = isset( $wort_d['CITY'][ $wort_name ] ) ? $wort_d['CITY'][ $wort_name ] : null;
	$wort_g    = isset( $wort_d['GUIDE'][ $wort_name ] ) ? $wort_d['GUIDE'][ $wort_name ] : null;
	if ( $wort_c ) :
		$wort_n    = count( $wort_c['items'] );
		$wort_sels = count( array_unique( array_map( function ( $x ) { return $x['by']; }, $wort_c['items'] ) ) );
		?>
<article class="sheet visa-sheet">
	<div class="sheet-top"><span>Visa · <?php echo esc_html( wor_iso3( $wort_c['country'] ) ); ?></span><span>No. <?php echo esc_html( $wort_c['code'] . ' ' . sprintf( '%04d', $wort_n ) ); ?></span></div>
	<div class="visa-head">
		<?php echo wort_place_stamp( $wort_c, 150 ); // phpcs:ignore ?>
		<div>
			<p class="kicker"><?php echo wort_country_link( $wort_c['country'] ); // phpcs:ignore ?> · <?php echo esc_html( wort_coords( $wort_c['lat'], $wort_c['lon'] ) ); ?></p>
			<h1><?php echo esc_html( $wort_c['city'] ); ?></h1>
			<p class="meta"><?php echo esc_html( wort_plural( $wort_n, 'mix or playlist', 'mixes and playlists' ) . ' · ' . wort_plural( $wort_sels, 'selector', 'selectors' ) ); ?></p>
			<?php if ( $wort_n ) : ?><p class="actions"><a class="btn primary" href="<?php echo esc_url( home_url( '/#city-' . $wort_c['slug'] ) ); ?>">Open <?php echo esc_html( $wort_c['city'] ); ?> on the globe</a></p><?php endif; ?>
		</div>
	</div>
</article>
		<?php if ( $wort_n ) : ?>
<section><h2>Mixes and playlists from <?php echo esc_html( $wort_c['city'] ); ?></h2><div class="cards"><?php foreach ( $wort_c['items'] as $wort_x ) { echo wort_card( $wort_x, wort_selector_name( $wort_x['by'] ) ); } // phpcs:ignore ?></div></section>
		<?php endif; ?>
		<?php if ( $wort_g ) : ?>
<section class="guide">
	<h2><?php echo esc_html( wort_t( 'sound_of' ) ); ?> <?php echo esc_html( $wort_c['city'] ); ?></h2>
	<?php echo wort_paras( $wort_g['intro'] ); // phpcs:ignore ?>
			<?php if ( $wort_g['born'] ) : ?>
	<div class="g-block"><h3><?php echo esc_html( wort_t( 'born' ) ); ?></h3><p class="g-names"><?php echo implode( ' · ', array_map( 'wort_nm', $wort_g['born'] ) ); // phpcs:ignore ?></p></div>
			<?php endif; ?>
	<div class="g-grid"><?php echo wort_glist( wort_t( 'adopted' ), $wort_g['adopted'] ) . wort_glist( wort_t( 'listen' ), $wort_g['listen'] ) . wort_glist( wort_t( 'buy' ), $wort_g['buy'] ) . wort_glist( wort_t( 'radio' ), $wort_g['radio'] ); // phpcs:ignore ?></div>
</section>
		<?php endif; ?>
		<?php
	endif;
endif;
get_footer();
