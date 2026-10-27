import {Suspense} from 'react';
import AuthLayout from '@/components/AuthLayout';
import AuthForm from '@/components/AuthForm';
export default function Page(){return <AuthLayout><Suspense fallback={<p>Loading authentication...</p>}><AuthForm mode="reset"/></Suspense></AuthLayout>}
