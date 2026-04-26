import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import type { Item, ItemCategory } from '../types';
import { ITEM_CATEGORIES } from '../constants';
import { geminiService } from '../services/geminiService';
import { mockApiService } from '../services/mockApiService';

interface ReportItemViewProps {
  type: 'lost' | 'found';
  onReportSubmit: (item: Item) => void;
  onBack: () => void;
}

const FloatingLabelInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
    <div className="relative">
        <input 
            id={id} 
            placeholder=" " 
            {...props} 
            className="block px-4 pb-2 pt-6 w-full text-sm text-deep-navy dark:text-warm-gray bg-transparent rounded-xl border border-gray-300 dark:border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-primary-green peer"
        />
        <label 
            htmlFor={id} 
            className="absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
        >
            {label}
        </label>
    </div>
);

const FloatingLabelSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, children: React.ReactNode }> = ({ label, id, children, ...props }) => (
    <div className="relative">
        <select 
            id={id}
            {...props}
            className="block px-4 pb-2 pt-6 w-full text-sm text-deep-navy dark:text-warm-gray bg-white dark:bg-deep-navy rounded-xl border border-gray-300 dark:border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-primary-green peer"
        >
            {children}
        </select>
        <label 
            htmlFor={id} 
            className="absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-4"
        >
            {label}
        </label>
    </div>
);

const FloatingLabelTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, id, ...props }) => (
    <div className="relative">
        <textarea 
            id={id}
            placeholder=" "
            {...props} 
            className="block px-4 pb-2 pt-6 w-full text-sm text-deep-navy dark:text-warm-gray bg-transparent rounded-xl border border-gray-300 dark:border-gray-600 appearance-none focus:outline-none focus:ring-0 focus:border-primary-green peer"
        />
        <label 
            htmlFor={id} 
            className="absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
        >
            {label}
        </label>
    </div>
);


export const ReportItemView: React.FC<ReportItemViewProps> = ({ type, onReportSubmit, onBack }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Other');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiImageLoading, setIsAiImageLoading] = useState(false);
  const [isAiDescLoading, setIsAiDescLoading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        analyzeImageWithAI(file);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const analyzeImageWithAI = async (file: File) => {
    setIsAiImageLoading(true);
    const result = await geminiService.getImageInsight(file);
    if (result) {
        setName(prev => prev || result.detectedName);
        if (ITEM_CATEGORIES.includes(result.possibleCategory)) {
             setCategory(result.possibleCategory as ItemCategory);
        }
        setDescription(prev => prev || result.autoDescription);
    }
    setIsAiImageLoading(false);
  };
  
  const improveDescriptionWithAI = async () => {
    if(!description) return;
    setIsAiDescLoading(true);
    const improvedDesc = await geminiService.improveDescription(description);
    setDescription(improvedDesc);
    setIsAiDescLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // In a real app, you'd upload the image and get a URL
    const imageUrl = imagePreview || `https://picsum.photos/seed/${Date.now()}/400/300`;

    const newItemData = {
      name,
      category,
      description,
      location,
      date: new Date(date).toISOString(),
      status: type,
      imageUrl,
    };
    
    const reportedItem = await mockApiService.reportItem(newItemData);
    onReportSubmit(reportedItem);
    setIsSubmitting(false);
  };
  
  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-deep-navy p-6 md:p-8 rounded-2xl shadow-soft-lg">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 text-gray-500 hover:text-primary-green dark:hover:text-primary-gold">
            <ArrowLeftIcon />
        </button>
        <h2 className="text-3xl font-bold text-deep-navy dark:text-white capitalize">Report {type} Item</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photo of Item</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-2xl">
                 <div className="space-y-2 text-center">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Item preview" className="mx-auto h-48 w-auto rounded-xl" />
                    ) : (
                        <ImageIcon />
                    )}
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-primary-green hover:text-green-700 dark:text-primary-gold dark:hover:text-yellow-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-green p-1">
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange}/>
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
                    {isAiImageLoading && (
                        <div className="flex items-center justify-center text-sm text-primary-green dark:text-primary-gold mt-2">
                           <Spinner small /> <span className="ml-2">Gemini is analyzing...</span>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        <FloatingLabelInput label="Item Name" id="name" type="text" value={name} onChange={e => setName(e.target.value)} required />
        
        <FloatingLabelSelect label="Category" id="category" value={category} onChange={e => setCategory(e.target.value as ItemCategory)} required>
            {ITEM_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </FloatingLabelSelect>

        <div>
            <FloatingLabelTextarea label="Description" id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={4} />
            <button type="button" onClick={improveDescriptionWithAI} disabled={isAiDescLoading || !description} className="mt-2 text-sm text-primary-green dark:text-primary-gold font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                {isAiDescLoading ? <><Spinner small/> <span className="ml-2">Improving...</span></> : '✨ Improve with Gemini'}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FloatingLabelInput label="Last Seen / Found Location" id="location" type="text" value={location} onChange={e => setLocation(e.target.value)} required />
            <FloatingLabelInput label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isSubmitting} className="w-full md:w-auto flex justify-center py-3 px-8 border border-transparent rounded-pill shadow-soft text-base font-medium text-white bg-primary-green hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-green disabled:bg-gray-400">
            {isSubmitting ? <><Spinner small white /> <span className="ml-2">Submitting...</span></> : `Submit ${type.charAt(0).toUpperCase() + type.slice(1)} Report`}
          </button>
        </div>
      </form>
    </div>
  );
};

const ArrowLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const ImageIcon: React.FC = () => (
    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const Spinner: React.FC<{small?: boolean, white?: boolean}> = ({small, white}) => (
    <div className={`animate-spin rounded-full border-b-2 ${small ? 'h-5 w-5' : 'h-8 w-8'} ${white ? 'border-white' : 'border-primary-green'}`}></div>
);