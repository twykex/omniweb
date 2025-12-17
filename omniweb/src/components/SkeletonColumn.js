import React from 'react';

const SkeletonColumn = () => (
    <div className="column">
        <div className="column-header loading-text">THINKING...</div>
        <div className="node-list">
            {[1,2,3,4].map(i => (
                <div key={i} className="node-card skeleton-card">
                    <div className="sk-line w-50" style={{height: 20, marginBottom: 8}}></div>
                    <div className="sk-line w-100"></div>
                </div>
            ))}
        </div>
    </div>
);

export default SkeletonColumn;
