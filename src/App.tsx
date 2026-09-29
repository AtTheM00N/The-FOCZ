import { useRef } from 'react'
import { Brand, Arrow } from './components/Brand'
import { product, links, faqs } from './data'
import { WorldGallery } from './components/WorldGallery'
import { useExperience, useReducedMotion } from './useExperience'
import ScrollFilm from './film/ScrollFilm'

export default function App() {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  useExperience(root, reduced)

  return <main ref={root}>
    <a className="skip-link" href="#formula">Skip to the ingredients</a>
    <ScrollFilm reduced={reduced} />
    <header className="site-header">
      <a href="#top" aria-label="FOCZ home"><Brand /></a>
      <nav aria-label="Main navigation"><a href="#formula">Ingredients</a><a href="#world">Out there</a></nav>
    </header>

    <section id="formula" className="formula-section section-pad" aria-labelledby="formula-heading">
      <div data-reveal><span className="eyebrow">01 / Formula</span><h2 id="formula-heading">On the label.</h2><p className="label-note">Refer to the product label for the full ingredients and consumption guidance.</p></div>
      <ol className="formula-list">{product.ingredients.map((ingredient, i) => <li key={ingredient}><span className="mono">0{i + 1}</span><span>{ingredient}</span></li>)}</ol>
    </section>

    <WorldGallery />

    <section id="launch" className="launch-section section-pad" aria-labelledby="launch-heading">
      <div data-reveal><span className="eyebrow">03 / Launch</span><h2 id="launch-heading">Launch list.</h2></div>
      <div className="launch-card" data-reveal><h3>Win a free case.</h3><p>Five up for grabs on launch day.</p><a className="button button-dark" href={links.launch} target="_blank" rel="noreferrer">Join the list <Arrow diagonal /></a><span className="mono launch-terms">No purchase necessary</span></div>
    </section>

    <section className="faq-section section-pad" aria-labelledby="faq-heading"><div><h2 id="faq-heading">Details.</h2></div><div className="faq-list">{faqs.map((faq, i) => <details key={faq.q}><summary><span className="mono">0{i + 1}</span>{faq.q}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{faq.a}</p></details>)}</div></section>

    <footer className="site-footer section-pad"><div className="footer-top"><a className="footer-brand" href="#top" aria-label="FOCZ home"><Brand /></a><a className="text-link" href="#top">Back to top ↑</a></div><div className="footer-bottom"><span className="mono">© {new Date().getFullYear()} FOCZ</span><a className="text-link" href={links.instagram} target="_blank" rel="noreferrer">Instagram <Arrow diagonal /></a></div></footer>
  </main>
}
