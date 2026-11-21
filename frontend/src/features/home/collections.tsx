import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { allergenOptions } from '@/features/products/api/filters';
import type { Category } from '@/lib/api/catalog.types';
import { cn } from '@/lib/utils';
import omega480 from '@/assets/banners/tile-omega3-480.webp';
import omega960 from '@/assets/banners/tile-omega3-960.webp';
import berry320 from '@/assets/banners/tile-dau-tay-320.webp';
import berry640 from '@/assets/banners/tile-dau-tay-640.webp';
import avocado320 from '@/assets/banners/tile-bo-320.webp';
import avocado640 from '@/assets/banners/tile-bo-640.webp';
import greens400 from '@/assets/banners/tile-rau-xanh-400.webp';
import greens800 from '@/assets/banners/tile-rau-xanh-800.webp';
import grains400 from '@/assets/banners/tile-ngu-coc-400.webp';
import grains800 from '@/assets/banners/tile-ngu-coc-800.webp';
import protein320 from '@/assets/banners/tile-protein-320.webp';
import protein640 from '@/assets/banners/tile-protein-640.webp';
import plantMilk320 from '@/assets/banners/tile-sua-thuc-vat-320.webp';
import plantMilk640 from '@/assets/banners/tile-sua-thuc-vat-640.webp';
import lowSugar400 from '@/assets/banners/tile-it-duong-400.webp';
import lowSugar800 from '@/assets/banners/tile-it-duong-800.webp';
import allergens400 from '@/assets/banners/tile-di-ung-400.webp';
import allergens800 from '@/assets/banners/tile-di-ung-800.webp';

type Tile = {
  title: string;
  kicker: string;
  /** Category slug (resolved to the live id) or a ready filter URL. */
  category?: string;
  to?: string;
  className: string;
  image: readonly [string, string, number];
  tone: 'photo' | 'photo-wide';
};

// AI-generated mood photos (docs/image-credits.md); every tile opens a real catalog view.
const tiles: Tile[] = [
  {
    title: 'Cá, thịt & hải sản',
    kicker: 'Bộ sưu tập',
    category: 'thit-ca-hai-san',
    image: [omega480, omega960, 480],
    className: 'col-span-2 row-span-2',
    tone: 'photo',
  },
  {
    title: 'Giàu protein',
    kicker: '≥ 20% năng lượng',
    to: '/products?label=HIGH_PROTEIN',
    image: [protein320, protein640, 320],
    className: '',
    tone: 'photo',
  },
  {
    title: 'Trái cây tươi',
    kicker: 'Danh mục',
    category: 'trai-cay-tuoi',
    image: [berry320, berry640, 320],
    className: '',
    tone: 'photo',
  },
  {
    title: 'Thuần thực vật',
    kicker: 'Nhãn dinh dưỡng',
    to: '/products?label=PLANT_BASED',
    image: [avocado320, avocado640, 320],
    className: '',
    tone: 'photo',
  },
  {
    title: 'Hỏi AI: “món nào không có sữa?”',
    kicker: 'Tra cứu AI',
    to: '/chat',
    image: [plantMilk320, plantMilk640, 320],
    className: '',
    tone: 'photo',
  },
  {
    title: 'Rau củ',
    kicker: 'Danh mục',
    category: 'rau-cu',
    image: [greens400, greens800, 400],
    className: 'col-span-2',
    tone: 'photo-wide',
  },
  {
    title: 'Ngũ cốc',
    kicker: 'Danh mục',
    category: 'ngu-coc',
    image: [grains400, grains800, 400],
    className: 'col-span-2',
    tone: 'photo-wide',
  },
  {
    title: 'Ít đường',
    kicker: '≤ 5 g / 100 g',
    to: '/products?label=LOW_SUGAR',
    image: [lowSugar400, lowSugar800, 400],
    className: 'col-span-2',
    tone: 'photo-wide',
  },
  {
    title: `Loại trừ ${allergenOptions.length} chất gây dị ứng`,
    kicker: 'Bộ lọc',
    to: '/products',
    image: [allergens400, allergens800, 400],
    className: 'col-span-2',
    tone: 'photo-wide',
  },
];

function href(tile: Tile, categories: Category[] | undefined) {
  if (tile.to) return tile.to;
  const id = categories?.find(
    (category) => category.slug === tile.category,
  )?.id;
  // Before categories load (or if a slug changes), fall back to the full catalog.
  return id ? `/products?categoryId=${id}` : '/products';
}

export function Collections({ categories }: { categories?: Category[] }) {
  return (
    <ul className="collections">
      {tiles.map((tile) => (
        <li key={tile.title} className={cn('collection-tile', tile.className)}>
          <Link
            to={href(tile, categories)}
            className="collection-link"
            data-tone={tile.tone}
          >
            <img
              src={tile.image[0]}
              srcSet={`${tile.image[0]} ${tile.image[2]}w, ${tile.image[1]} ${tile.image[2] * 2}w`}
              sizes="(min-width: 940px) 25vw, 50vw"
              alt=""
              loading="lazy"
              decoding="async"
              className="collection-image"
            />
            <span className="collection-copy">
              <span className="collection-kicker">{tile.kicker}</span>
              <span className="collection-title">{tile.title}</span>
            </span>
            <ArrowRight aria-hidden="true" className="collection-arrow" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
