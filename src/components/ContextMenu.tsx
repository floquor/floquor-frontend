import { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '@/types';
import { BsChevronRight } from 'react-icons/bs';

const MENU_ITEM_STYLES = {
  button: "w-full px-2 py-1 text-sm text-[var(--text-primary)] hover:bg-[var(--menu-hover)] text-left whitespace-nowrap flex items-center justify-between",
  menu: "fixed bg-[var(--menu-background)] min-w-[20px] border border-[var(--menu-border)] rounded shadow-lg py-0 z-50",
  title: "px-2 bg-[var(--menu-title-background)] py-1 text-sm font-medium text-[var(--text-primary)] border-b border-[var(--menu-border)]",
  iconContainer: "w-4 mr-2 flex items-center justify-center",
  tip: "absolute left-full top-0 ml-2 px-2 py-1 bg-[var(--menu-background)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap pointer-events-none z-50 border border-[var(--menu-border)]"
};

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  items: MenuItem[];
  title?: string;
}

interface SubMenuProps {
  items: MenuItem[];
  parentRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

// 检查菜单项数组中是否有任何一项包含图标（只检查当前级别）
const hasAnyIcon = (items: MenuItem[]): boolean => {
  return items.some(item => item.icon !== undefined);
};

interface MenuItemComponentProps {
  item: MenuItem;
  onClose: () => void;
  showIcons?: boolean;
}

const SubMenu: React.FC<SubMenuProps> = ({ items, parentRef, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  // 只检查当前子菜单级别的图标
  const showIcons = hasAnyIcon(items);

  useEffect(() => {
    if (menuRef.current && parentRef.current) {
      const parentRect = parentRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = parentRect.right;
      let top = parentRect.top;

      if (left + menuRect.width > viewportWidth) {
        left = parentRect.left - menuRect.width;
      }

      if (top + menuRect.height > viewportHeight) {
        top = viewportHeight - menuRect.height;
      }

      menuRef.current.style.left = `${left}px`;
      menuRef.current.style.top = `${top}px`;
    }
  }, [parentRef]);

  return (
    <div
      ref={menuRef}
      className={MENU_ITEM_STYLES.menu}
    >
      {items.map((item, index) => (
        <MenuItemComponent key={index} item={item} onClose={onClose} showIcons={showIcons} />
      ))}
    </div>
  );
};

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({ item, onClose, showIcons }) => {
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={() => {
        if (item.children) setShowSubMenu(true);
        setShowTip(true);
      }}
      onMouseLeave={() => {
        if (item.children) setShowSubMenu(false);
        setShowTip(false);
      }}
    >
      <button
        className={MENU_ITEM_STYLES.button}
        onClick={(e) => {
          e.stopPropagation();
          if (!item.children && item.onClick) {
            item.onClick();
            onClose();
          }
        }}
      >
        <span className="flex items-center">
          {showIcons && (
            <span className={MENU_ITEM_STYLES.iconContainer}>
              {item.icon}
            </span>
          )}
          {item.label}
        </span>
        {item.children && <BsChevronRight className="ml-2" />}
      </button>
      {item.tip && showTip && (
        <div className={MENU_ITEM_STYLES.tip} style={{ opacity: 1 }}>
          {item.tip}
        </div>
      )}
      {showSubMenu && item.children && (
        <SubMenu items={item.children} parentRef={itemRef} onClose={onClose} />
      )}
    </div>
  );
};

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, items, title }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const showIcons = hasAnyIcon(items);

  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className={MENU_ITEM_STYLES.menu}
      style={{ left: x, top: y }}
    >
      {title && (
        <div className={MENU_ITEM_STYLES.title}>
          {title}
        </div>
      )}
      {items.map((item, index) => (
        <MenuItemComponent key={index} item={item} onClose={onClose} showIcons={showIcons} />
      ))}
    </div>
  );
};

export default ContextMenu; 