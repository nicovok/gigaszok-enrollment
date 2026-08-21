export type TplContent = {
  subject?: string | null;
  body?: string | null;
  banner_path?: string | null;
};

export const DEFAULT_TEMPLATES = {
  registration: {
    subject: "Beiratkozási jelentkezés beérkezett – {child_name}",
    body: "Köszönjük jelentkezésed az adott tanévre a Gigászok Sportegyesület úszó szakosztályába.\nJelentkezésed egy 5.000 Ft-os szakosztályi hozzájárulással tudod megerősíteni, amely természetesen a szeptemberi szakosztályi hozzájárulásból jóváírásra kerül.\n\n{bank_adatok}\n\nA regisztráció megerősítésére azért van szükség, mert csoportjaink évről évre túltelítettek, és ezúton szeretnénk helyet biztosítani a valóban motivált és elkötelezett jelentkezőknek.\nA tanévvel kapcsolatos további információkat erre az e-mail címre fogod megkapni. Csobbanj velünk szeptemberben!",
  },
  reminder: {
    subject: "Emlékeztető: beiratkozási díj – {child_name}",
    body: "Emlékeztetőül jelezzük, hogy {child_name} beiratkozása még nem véglegesített, mivel az 5 000 Ft-os szakosztályi hozzájárulás még nem érkezett meg.\nKérjük, utald el az összeget az alábbi adatokkal:\n\n{bank_adatok}\n\nHa már átutaltad, kérjük hagyd figyelmen kívül ezt az üzenetet!\nAmennyiben vissza szeretnéd vonni a jelentkezést, kérjük jelezd az alábbi elérhetőségek egyikén.",
  },
  payment_confirmation: {
    subject: "Beiratkozás megerősítve – {child_name}",
    body: "Örömmel értesítünk, hogy {child_name} beiratkozási díja (5 000 Ft) megérkezett!\nA beiratkozás <strong>visszaigazolva</strong>. Az 5 000 Ft az első havidíjba kerül beszámításra.\nVárunk szeptemberben úszni! 🏊",
  },
} as const;
