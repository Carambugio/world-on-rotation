<?php
/**
 * Ordinary pages, such as About.
 */
get_header();
while ( have_posts() ) :
	the_post();
	?>
<div class="intro-block page-body">
	<p class="eyebrow"><?php the_title(); ?></p>
	<h1><?php echo is_page( 'about' ) ? esc_html( get_bloginfo( 'name' ) ) : esc_html( get_the_title() ); ?></h1>
	<?php the_content(); ?>
	<?php if ( is_page( 'about' ) ) : ?>
	<p class="motto big"><?php echo esc_html( wort_motto() ); ?></p>
	<p class="actions"><a class="btn primary" href="<?php echo esc_url( home_url( '/' ) ); ?>">Open the globe</a><a class="btn" href="<?php echo esc_url( home_url( '/places/' ) ); ?>">Browse the places</a><a class="btn" href="https://rhythmpassport.com/">rhythmpassport.com ↗</a></p>
	<?php endif; ?>
</div>
	<?php
endwhile;
get_footer();
