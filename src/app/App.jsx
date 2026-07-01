import React from 'react';
import AppProviders from './AppProviders.jsx';
import AppShell from '../components/layout/AppShell.jsx';

function App() {
    return (
        <AppProviders>
            <AppShell />
        </AppProviders>
    );
}

export default App;
