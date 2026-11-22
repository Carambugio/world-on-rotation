</main>
<footer class="foot"><div class="wrap foot-in">
	<p class="motto"><?php echo esc_html( wort_motto() ); ?></p>
	<?php if ( wort_t( 'footer_text' ) ) : ?>
	<p><?php if ( wort_t( 'footer_url' ) ) : ?><a href="<?php echo esc_url( wort_t( 'footer_url' ) ); ?>"><?php echo esc_html( wort_t( 'footer_text' ) ); ?></a><?php else : ?><?php echo esc_html( wort_t( 'footer_text' ) ); ?><?php endif; ?></p>
	<?php endif; ?>
</div></footer>
<?php wp_footer(); ?>
</body>
</html>
