import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import './SearchableSelect.css';

export function SearchableSelect({ options, value, onChange, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(''); // Clear search on close
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    const label = typeof opt === 'string' ? opt : opt.label;
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const displayValue = (() => {
    if (!value) return placeholder;
    const selectedOpt = options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value);
    return selectedOpt ? (typeof selectedOpt === 'string' ? selectedOpt : selectedOpt.label) : value;
  })();

  return (
    <div className="searchable-select" ref={wrapperRef}>
      <div 
        className="searchable-select__control form-input" 
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
      >
        <span className="searchable-select__value">
          {displayValue}
        </span>
        <ChevronDown size={16} />
      </div>
      
      {isOpen && (
        <div className="searchable-select__menu">
          <div className="searchable-select__search-wrapper">
            <Search size={14} className="searchable-select__search-icon" />
            <input
              type="text"
              className="searchable-select__search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <ul className="searchable-select__options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const val = typeof opt === 'string' ? opt : opt.value;
                const label = typeof opt === 'string' ? opt : opt.label;
                return (
                  <li
                    key={val}
                    className={`searchable-select__option ${val === value ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(val);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    {label}
                  </li>
                );
              })
            ) : (
              <li className="searchable-select__no-options">No results found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
