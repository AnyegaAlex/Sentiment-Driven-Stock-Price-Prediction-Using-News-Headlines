import PropTypes from 'prop-types';
import BrandNameCard from './Header/BrandNameCard';
import NavigationCards from './Header/NavigationCards';
import SymbolSearchCard from './Header/SymbolSearchCard';
import UserMenu from './Header/UserMenu';

const Header = ({ onSymbolSelect }) => (
  <header className="sticky top-0 z-50 border-b border-transparent bg-transparent">
    <div className="mx-auto max-w-[1450px] px-3 sm:px-6 lg:px-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 lg:flex lg:justify-between lg:gap-3 lg:py-3">
        <BrandNameCard />

        <UserMenu className="col-start-2 row-start-1 lg:order-3" />

        <div className="col-span-2 flex min-w-0 flex-col gap-2 lg:order-2 lg:flex-1 lg:flex-row lg:items-center lg:justify-end lg:gap-3">
          <NavigationCards className="w-full lg:w-auto" />
          <div className="w-full min-w-0 lg:w-auto lg:min-w-[200px] lg:max-w-[280px]">
            <SymbolSearchCard onSymbolSelect={onSymbolSelect} />
          </div>
        </div>
      </div>
    </div>
  </header>
);

Header.propTypes = {
  onSymbolSelect: PropTypes.func.isRequired,
};

export default Header;
