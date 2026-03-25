

export default function Header() {
  return (
    <header className="bebop-header">
      <div className="hbg"></div>

      {/* <div className="site-id">KYGRA.XYZ</div> */}

      {/* BASE LAYER — dark text, sits below and is visible on the cream background */}
      <div className="hero-content hero-content--base">
        <div className="hero-name fi">KYGRA</div>
        <div className="hero-sub fi2">
          I AM FROM THE FUTURE
        </div>
      </div>

      {/* INVERT LAYER — cream text, absolute to viewport, clipped to the right-hand black area */}
      <div className="hero-content hero-content--invert" aria-hidden="true">
        <div className="hero-name fi">KYGRA</div>
        <div className="hero-sub fi2">I AM FROM THE FUTURE</div>
      </div>

      {/* <div className="hstrip">
        <span>
          BOUNTY HUNTER · DIGITAL MERCENARY · MARKET OPERATOR · FREE AGENT · NO MASTERS · NO FIXED ORBIT · PERPETUAL FUTURES · SEE YOU SPACE COWBOY ·&nbsp;&nbsp;
          BOUNTY HUNTER · DIGITAL MERCENARY · MARKET OPERATOR · FREE AGENT · NO MASTERS · NO FIXED ORBIT · PERPETUAL FUTURES · SEE YOU SPACE COWBOY ·&nbsp;&nbsp;
        </span>
      </div> */}
    </header>
  )
}
