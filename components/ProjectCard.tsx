
import React from 'react';
import { Project } from '../types';

interface ProjectCardProps {
  project: Project;
  onAddToCart: (p: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onAddToCart }) => {
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-[#FFB800]' : 'text-gray-200'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow group h-full">
      {/* Image and Badges */}
      <div className="relative w-full aspect-square mb-6">
        {project.originalPrice && (
          <div className="absolute top-0 left-0 z-10 flex flex-col gap-1 items-start">
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-tighter">Reduced price</span>
            {project.discount && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-tighter">{project.discount}</span>
            )}
          </div>
        )}
        
        {/* Video Icon Badge */}
        {project.video && (
          <div className="absolute top-2 right-2 z-10 bg-white/90 p-1.5 rounded-lg shadow-sm">
             <svg className="w-4 h-4 text-[#FFB800]" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg>
          </div>
        )}

        <img 
          src={project.image} 
          alt={project.name} 
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center w-full">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">REFERENCE: {project.reference}</p>
        <h3 className="text-sm font-bold text-slate-800 uppercase line-clamp-2 leading-tight mb-3 min-h-[40px]">
          {project.name}
        </h3>
        
        {/* Rating Section */}
        <div className="flex flex-col items-center gap-1 mb-4">
          {renderStars(project.rating)}
          <div className="flex gap-1 text-[10px] font-bold">
            <span className="text-gray-400">{project.reviewCount}</span>
            <button className="text-slate-900 hover:text-[#FFB800] underline transition-colors">review</button>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-lg font-black text-red-500">BDT {project.price.toLocaleString()}</span>
            {project.originalPrice && (
              <span className="text-xs font-bold text-gray-400 line-through decoration-gray-400 decoration-1">
                BDT {project.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4">
          {project.inStock ? (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(project);
                }}
                className="w-full border border-gray-200 py-2.5 rounded flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-gray-300 transition-all group/btn"
              >
                <svg className="w-4 h-4 text-slate-900 group-hover/btn:text-[#FFB800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-[10px] font-black uppercase text-slate-900 tracking-wider">Add to cart</span>
              </button>
              <div className="flex items-center justify-center gap-1.5 text-green-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[11px] font-black uppercase tracking-tighter">In Stock</span>
              </div>
            </>
          ) : (
            <button className="w-full bg-green-500 text-white py-2.5 rounded text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-colors">
              NOTIFY ME
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
