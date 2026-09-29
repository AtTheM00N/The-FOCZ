import { Arrow } from './Brand'
import { links, worlds } from '../data'
import './world-gallery.css'

export function WorldGallery() {
  return <section id="world" className="world-section section-pad" aria-labelledby="world-heading">
    <div className="world-shell">
      <div className="section-top"><span className="mono">02 / In the elements</span><a className="text-link" href={links.instagram} target="_blank" rel="noreferrer">@drinkfocz <Arrow diagonal /></a></div>
      <h2 className="world-heading" id="world-heading" data-reveal>Out there.</h2>
      <div className="world-grid">{worlds.map((world, i) => <a className={`world-card world-card-${world.image}`} key={world.name} href={world.url} target="_blank" rel="noreferrer" aria-label={`See the FOCZ ${world.name.toLowerCase()} campaign on Instagram`}>
        <figure className="world-figure">
          <div className="world-image"><img src={`/focz/${world.image}.jpg`} alt={world.alt} width={world.width} height={world.height} loading="lazy" decoding="async" /></div>
          <figcaption className="world-caption"><h3>{world.name}</h3><span className="world-caption-meta" aria-hidden="true"><span className="mono">0{i + 1}</span><Arrow diagonal /></span></figcaption>
        </figure>
      </a>)}</div>
    </div>
  </section>
}
