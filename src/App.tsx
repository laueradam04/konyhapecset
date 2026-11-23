import { useEffect, type ReactNode } from 'react';
import { useDB } from './data/store';
import { useRoute } from './router';
import { TabBar } from './components';
import { Today } from './screens/Today';
import { Measure, MeasurePick } from './screens/Measure';
import { Delivery } from './screens/Delivery';
import { Report } from './screens/Report';
import { Settings } from './screens/Settings';
import { QrSheet } from './screens/QrSheet';
import { Onboarding } from './screens/Onboarding';

export default function App() {
  const db = useDB();
  const route = useRoute();
  const path = route.join('/');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  if (!db.settings) {
    return (
      <div className="app app-bare">
        <main>
          <Onboarding />
        </main>
      </div>
    );
  }

  const [section, param] = route;
  let screen: ReactNode;
  switch (section) {
    case 'meres':
      screen = param ? <Measure key={param} id={param} /> : <MeasurePick />;
      break;
    case 'atvetel':
      screen = <Delivery />;
      break;
    case 'naplo':
      screen = <Report />;
      break;
    case 'beallitasok':
      screen = <Settings />;
      break;
    case 'qr':
      screen = <QrSheet />;
      break;
    default:
      screen = <Today />;
  }

  const active = section === 'qr' ? 'beallitasok' : section ?? 'ma';

  return (
    <div className="app">
      <main>{screen}</main>
      <TabBar active={active} />
    </div>
  );
}
