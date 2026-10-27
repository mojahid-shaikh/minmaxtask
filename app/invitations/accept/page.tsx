import {Suspense} from 'react';import AcceptInvitation from '@/components/AcceptInvitation';
export default function Page(){return <main style={{maxWidth:550,margin:'15vh auto',padding:20}}><Suspense fallback={<p>Loading...</p>}><AcceptInvitation/></Suspense></main>}
