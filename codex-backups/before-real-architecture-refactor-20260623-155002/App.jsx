import React from 'react';
import AppProviders from './AppProviders.jsx';
import AppRoutes from './AppRoutes.jsx';

function App() {
    return (
        <AppProviders>
            <AppRoutes />
        </AppProviders>
    );
}

export default App;
