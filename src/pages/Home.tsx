import Header from "../components/Header";
import Manifesto from "../components/Manifesto";

const Home = () => {
  return (
    <div style={{ background: "var(--bg-primary)" }}>
      <Header />
      <Manifesto />
    </div>
  );
};

export default Home;
