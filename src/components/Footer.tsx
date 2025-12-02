import { quotes } from '../lib/consts';

function getMessage(list: string[]): string {
  let r = Math.floor(Math.random() * list.length);
  return list[r];
}

const Footer = () => {
  const q = getMessage(quotes).split('<br />');

  return (
    <footer className="w-full max-w-3xl mx-auto pt-4 pb-10 sm:pb-14">
     
      <div className="border-0 border-t border-dashed flex flex-col gap-4 py-3">
        <i>
          {q[0]} <br /> <small>{q[1]}</small>
        </i>
      </div>

    </footer>
  );
};

export default Footer;
