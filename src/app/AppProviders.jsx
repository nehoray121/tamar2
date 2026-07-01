import { ThemeProvider } from '../features/theme/ThemeContext.jsx';

const AppProviders = ({ children }) => (
    <ThemeProvider>
        {children}
    </ThemeProvider>
);

export default AppProviders;
