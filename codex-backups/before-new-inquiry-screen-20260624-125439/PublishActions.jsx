import React from 'react';
import { Button } from '../../../components/ui/index.js';

const PublishActions = () => (
                    <div className="flex gap-3 mt-1 shrink-0 justify-end px-2">
                        <Button variant="ghost" className="px-5 py-1 text-[11px] font-bold rounded-md shadow-sm">בטל פנייה</Button>
                        <Button variant="outline" className="px-5 py-1 text-[11px] font-bold rounded-md shadow-sm border-brand-blue text-brand-blue">פרסם ושמור</Button>
                        <Button className="px-7 py-1 text-[11px] font-bold rounded-md shadow-sm">פרסם פנייה</Button>
                    </div>
);

export default PublishActions;
