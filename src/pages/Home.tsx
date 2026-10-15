import CartographicHero from "../components/CartographicHero";
import Manifesto from "../components/Manifesto";

const Home = () => {
  return (
    <div style={{ background: "var(--bg-primary)" }}>
      <CartographicHero />
      <Manifesto />
    </div>
  );
};

export default Home;
