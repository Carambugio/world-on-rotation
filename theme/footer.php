</main>
<footer class="foot"><div class="wrap foot-in">
	<p class="motto"><?php echo esc_html( wort_motto() ); ?></p>
	<?php if ( wort_t( 'footer_text' ) ) : ?>
	<p><?php if ( wort_t( 'footer_url' ) ) : ?><a href="<?php echo esc_url( wort_t( 'footer_url' ) ); ?>"><?php echo esc_html( wort_t( 'footer_text' ) ); ?></a><?php else : ?><?php echo esc_html( wort_t( 'footer_text' ) ); ?><?php endif; ?></p>
	<?php endif; ?>
	<p class="foot-links"><a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">About</a><a href="<?php echo esc_url( home_url( '/privacy-policy/' ) ); ?>">Privacy policy</a><a href="<?php echo esc_url( home_url( '/cookies/' ) ); ?>">Cookies</a></p>
</div></footer>
<?php wp_footer(); ?>
</body>
</html>
