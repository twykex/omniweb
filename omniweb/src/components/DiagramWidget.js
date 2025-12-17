import React, { useState } from 'react';

const DiagramWidget = ({ src, title }) => {
    const [loaded, setLoaded] = useState(false);

    return (
        <div className="diagram-widget">
            <div className="dw-header">
                <span className="dw-icon">⎔</span>
                <span className="dw-title">GENERATED DIAGRAM: {title.toUpperCase()}</span>
            </div>
            <div className="dw-frame">
                {!loaded && (
                    <div className="dw-loader">
                        <div className="spinner"></div>
                        <span>Rendering Schematic...</span>
                    </div>
                )}
                <img
                    src={src}
                    alt={title}
                    className="dw-image"
                    style={{ opacity: loaded ? 1 : 0 }}
                    onLoad={() => setLoaded(true)}
                />
            </div>
        </div>
    );
};

export default DiagramWidget;
