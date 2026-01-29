
import React from 'react';
import { Project } from './types';

export const PROJECTS: Project[] = [
  {
    id: 'v2v-01',
    name: 'SEEED STUDIO XIAO ESP32-C6 ULTRA-LOW POWER',
    description: 'Ultra-low power ESP32-C6 based development board.',
    price: 1299,
    reference: 'RBD-3609',
    rating: 5,
    reviewCount: 1,
    inStock: true,
    category: 'ESP32 PROJECTS',
    image: 'https://images.unsplash.com/photo-1558444479-c848512186c0?auto=format&fit=crop&q=80&w=800',
    specs: ['ESP32-C6', 'RISC-V', 'Zigbee', 'Matter']
  },
  {
    id: 'df-02',
    name: 'DFROBOT ESP32-S3 AI CAMERA MODULE EDGE COMPUTING',
    description: 'AI vision module with ESP32-S3 for edge processing.',
    price: 4280,
    reference: 'RBD-3632',
    rating: 0,
    reviewCount: 0,
    inStock: true,
    category: 'ESP32 PROJECTS',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
    specs: ['ESP32-S3', 'AI Vision', 'Micropython']
  },
  {
    id: 'esp-03',
    name: 'ESP32-S3 CAM DEVELOPMENT BOARD WITH OV2640',
    description: 'Versatile camera development board.',
    price: 1845,
    reference: 'RBD-2789',
    rating: 4,
    reviewCount: 6,
    inStock: true,
    category: 'ESP32 PROJECTS',
    image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&q=80&w=800',
    specs: ['ESP32-S3', 'OV2640', 'Wi-Fi/BT']
  },
  {
    id: 'watch-04',
    name: 'ESP32-S3 DEVELOPMENT BOARD WITH 1.28INCH ROUND LCD',
    description: 'Round display board for wearable projects.',
    price: 4390,
    reference: 'RBD-2770',
    rating: 5,
    reviewCount: 2,
    inStock: true,
    category: 'ESP32 PROJECTS',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
    specs: ['ESP32-S3', 'Round LCD', 'Touch Support']
  },
  {
    id: 'bala-05',
    name: 'BALA-C PLUS ESP32 SELF-BALANCING ROBOT KIT',
    description: 'Self-balancing educational robot kit.',
    price: 8350,
    originalPrice: 9850,
    discount: '- BDT 1,500',
    reference: 'RBD-2251',
    rating: 0,
    reviewCount: 0,
    inStock: true,
    category: 'BOT PROJECTS',
    image: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&q=80&w=800',
    specs: ['ESP32', 'IMU', 'PID Control']
  },
  {
    id: 'hiw-06',
    name: 'HIWONDER 6DOF METAL ROBOTIC ARM WITH CONTROLLER',
    description: 'High-performance metal robotic arm.',
    price: 21999,
    reference: 'RBD-1244',
    rating: 4,
    reviewCount: 1,
    inStock: false,
    category: 'BOT PROJECTS',
    image: 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&q=80&w=800',
    specs: ['6-DOF', 'Metal Servos', 'Wireless Control']
  }
];

export const SIDEBAR_CATEGORIES = [
  'BREADBOARD PROJECTS',
  'ARDUINO PROJECTS',
  'ESP32 PROJECTS',
  'STM32 PROJECTS',
  'CYBER PROJECTS',
  'RASBERRY PI PROJECTS',
  'BOT PROJECTS',
  'INDUSTRIAL PROJECTS',
  'DRONE PROJECTS',
  'DRONE BODY AND PARTS',
  '3D PRINTED ACCESSORIES',
  '3D PRINTER PARTS',
  'BLUEPRINTS OF PROJECTS',
  'PRESENTATION SLIDE OF PROJECTS',
  'OPEN SOURCE CODES'
];

export const LOGO_SVG = (
  <div className="flex flex-col items-center">
    <svg viewBox="0 0 100 100" className="w-20 h-20 md:w-28 md:h-28">
      {/* Golden Chip Pins - Top */}
      <line x1="38" y1="20" x2="38" y2="30" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="38" cy="18" r="2.5" fill="#FFB800" />
      <line x1="44" y1="20" x2="44" y2="30" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="44" cy="18" r="2.5" fill="#FFB800" />
      <line x1="50" y1="20" x2="50" y2="30" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="50" cy="18" r="2.5" fill="#FFB800" />
      <line x1="56" y1="20" x2="56" y2="30" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="56" cy="18" r="2.5" fill="#FFB800" />
      <line x1="62" y1="20" x2="62" y2="30" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="62" cy="18" r="2.5" fill="#FFB800" />

      {/* Pins - Bottom */}
      <line x1="38" y1="70" x2="38" y2="80" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="38" cy="82" r="2.5" fill="#FFB800" />
      <line x1="44" y1="70" x2="44" y2="80" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="44" cy="82" r="2.5" fill="#FFB800" />
      <line x1="50" y1="70" x2="50" y2="80" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="50" cy="82" r="2.5" fill="#FFB800" />
      <line x1="56" y1="70" x2="56" y2="80" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="56" cy="82" r="2.5" fill="#FFB800" />
      <line x1="62" y1="70" x2="62" y2="80" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="62" cy="82" r="2.5" fill="#FFB800" />

      {/* Pins - Left */}
      <line x1="20" y1="40" x2="30" y2="40" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="18" cy="40" r="2.5" fill="#FFB800" />
      <line x1="20" y1="46" x2="30" y2="46" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="18" cy="46" r="2.5" fill="#FFB800" />
      <line x1="20" y1="52" x2="30" y2="52" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="18" cy="52" r="2.5" fill="#FFB800" />
      <line x1="20" y1="58" x2="30" y2="58" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="18" cy="58" r="2.5" fill="#FFB800" />

      {/* Pins - Right */}
      <line x1="70" y1="40" x2="80" y2="40" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="82" cy="40" r="2.5" fill="#FFB800" />
      <line x1="70" y1="46" x2="80" y2="46" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="82" cy="46" r="2.5" fill="#FFB800" />
      <line x1="70" y1="52" x2="80" y2="52" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="82" cy="52" r="2.5" fill="#FFB800" />
      <line x1="70" y1="58" x2="80" y2="58" stroke="#FFB800" strokeWidth="2.5" />
      <circle cx="82" cy="58" r="2.5" fill="#FFB800" />

      {/* Main Chip Frame */}
      <rect x="30" y="30" width="40" height="40" rx="4" fill="none" stroke="#FFB800" strokeWidth="3" />
      <rect x="33" y="33" width="34" height="34" rx="2" fill="none" stroke="#FFB800" strokeWidth="1" opacity="0.5" />
      
      {/* Central Text */}
      <text x="50" y="52" fill="#FFB800" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, sans-serif">CP</text>
    </svg>
    <span className="text-base font-black text-[#FFB800] uppercase tracking-[0.25em] leading-none mt-2">Circuit Projects</span>
  </div>
);
