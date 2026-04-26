import React, { useState } from 'react';
import type { User } from '../types';
import { mockUser } from '../constants';

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
}

type AuthMode = 'decision' | 'login' | 'register';

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ReactNode }> = ({ label, id, type = "text", icon, ...props }) => (
    <div className="relative">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <div className="relative">
            {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
            <input 
                id={id} 
                type={type}
                {...props} 
                className={`mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl shadow-sm focus:ring-primary-green focus:border-primary-green sm:text-sm ${icon ? 'pl-10' : 'px-4'}`} 
            />
        </div>
    </div>
);

const Button: React.FC<{ onClick?: () => void; children: React.ReactNode; type?: 'button' | 'submit', fullWidth?: boolean, variant?: 'primary' | 'secondary' }> = ({ onClick, children, type = 'button', fullWidth = false, variant = 'primary' }) => {
    const baseClasses = `px-6 py-3 rounded-pill font-semibold shadow-soft transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 ${fullWidth ? 'w-full' : ''}`;
    const variantClasses = variant === 'primary' 
        ? "bg-primary-green text-white focus:ring-green-300"
        : "bg-primary-gold text-deep-navy focus:ring-yellow-300";
    return <button type={type} className={`${baseClasses} ${variantClasses}`} onClick={onClick}>{children}</button>
};

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState<AuthMode>('decision');
    const [error, setError] = useState('');
    
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate API call
        setError('');
        onLoginSuccess(mockUser);
    }
    
    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        // Simulate API call and login
        onLoginSuccess(mockUser);
    }
    
    const renderContent = () => {
        switch(mode) {
            case 'login':
                return (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input id="email" label="School Email" type="email" required icon={<MailIcon />} />
                        <Input id="password" label="Password" type="password" required icon={<LockIcon />}/>
                        <div className="flex items-center justify-between">
                            <a href="#" className="text-sm text-primary-green hover:underline">Forgot password?</a>
                        </div>
                        <Button type="submit" fullWidth>Login</Button>
                        <p className="text-center text-sm">
                            Don't have an account? <button type="button" onClick={() => setMode('register')} className="font-semibold text-primary-green hover:underline">Register</button>
                        </p>
                    </form>
                );
            case 'register':
                 return (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <Input id="name" label="Full Name" type="text" required />
                        <Input id="matric" label="Matric Number" type="text" required />
                        <Input id="email" label="School Email" type="email" required />
                        <Input id="password" label="Password" type="password" required />
                        <Input id="confirm-password" label="Confirm Password" type="password" required />
                        <div className="pt-2">
                           <Button type="submit" fullWidth variant="secondary">Create Account</Button>
                        </div>
                        <p className="text-center text-sm">
                            Already have an account? <button type="button" onClick={() => setMode('login')} className="font-semibold text-primary-green hover:underline">Login</button>
                        </p>
                    </form>
                );
            case 'decision':
            default:
                return (
                    <div className="text-center space-y-8">
                        <div>
                            <h1 className="text-4xl font-bold text-deep-navy dark:text-white">Welcome to GSU IntelliFind</h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-300">Please create an account or login to continue.</p>
                        </div>
                        <div className="flex flex-col space-y-4">
                            <Button onClick={() => setMode('register')} variant="secondary">Register</Button>
                            <Button onClick={() => setMode('login')}>Already have an account? Login</Button>
                        </div>
                    </div>
                );
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-warm-gray dark:bg-gray-900 p-4 transition-colors duration-300">
            <div className="w-full max-w-md mx-auto">
                 <div className="flex justify-center mb-8">
                     <svg className="w-20 h-20 text-primary-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                 </div>
                <div className="bg-white dark:bg-deep-navy p-8 rounded-3xl shadow-soft-lg">
                   {renderContent()}
                </div>
            </div>
        </div>
    );
};

const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;