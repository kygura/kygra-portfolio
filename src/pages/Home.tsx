import CartographicHero from "../components/CartographicHero";
import Legend from "../components/Legend";

const Home = () => {
  return (
    <div style={{ background: "var(--bg-primary)" }}>
      <CartographicHero />
      <Legend />
    </div>
  );
};

export default Home;
