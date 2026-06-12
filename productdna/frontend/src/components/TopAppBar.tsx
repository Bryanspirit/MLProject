import React from 'react';

const TopAppBar: React.FC = () => {
  return (
    <header className="sticky top-0 w-full z-40 bg-surface/80 dark:bg-inverse-surface/80 backdrop-blur-md border-b border-outline-variant dark:border-outline flex justify-between items-center h-16 px-container-padding">
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center w-full h-10 rounded-lg bg-surface-container-low border border-outline-variant overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
          <div className="grid place-items-center h-full w-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]" data-icon="search">search</span>
          </div>
          <input className="peer h-full w-full outline-none text-body-sm font-body-sm text-on-surface bg-transparent pr-2" id="search" placeholder="Search products, brands, or attributes..." type="text" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded-full p-1">
          <span className="material-symbols-outlined" data-icon="settings">settings</span>
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded-full p-1 relative">
          <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <div className="h-8 w-8 rounded-full bg-primary-container border border-outline-variant overflow-hidden ml-2 cursor-pointer">
          <img alt="User Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDWaJ0EpsFq_D2Dnedrd3sNSiShOSWZEZ9ZQbFWvdeX0LYD6OqN9YJ7501bylS3jhHVtklpbiQfysKt3L9vfI4_IlsRuSe12qOwO_JrvmcjQIASl3Ka_82Au_1AfGnNaFlvNKynBR3FTIwTxm65vwyAqmb8u-OoiVI0rSc-5PDQRat87qcIxjR3e9bd0r6lTB8Blmw5p867FrwkWaXzlAPOAYTs-YPEcEHn1mmpdo7MivE-vwsubD25V1mzagnt5e27QKBBpVdCDJm" />
        </div>
      </div>
    </header>
  );
};

export default TopAppBar;