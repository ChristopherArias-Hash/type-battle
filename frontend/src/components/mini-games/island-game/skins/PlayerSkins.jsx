export function Pirate ({ scale = 1, walkFrame = false, direction = "front" }){
  const FrontView = () => (
    <g>
      {/* Hat */}
      <rect x="10" y="6" width="12" height="2" fill="#2C1810" />
      <rect x="8" y="8" width="16" height="2" fill="#2C1810" />
      <rect x="14" y="6" width="4" height="2" fill="#8B0000" />
      <rect x="15" y="7" width="2" height="1" fill="#FFF" />
      {/* Head */}
      <rect x="12" y="10" width="8" height="6" fill="#FDBCB4" />
      {/* Eye patch */}
      <rect x="13" y="12" width="3" height="2" fill="#2C1810" />
      <rect x="12" y="13" width="1" height="1" fill="#2C1810" />
      <rect x="16" y="13" width="4" height="1" fill="#2C1810" />
      {/* Good eye */}
      <rect x="17" y="12" width="2" height="2" fill="#000" />
      {/* Beard */}
      <rect x="13" y="15" width="6" height="2" fill="#654321" />
      <rect x="12" y="16" width="1" height="1" fill="#654321" />
      <rect x="19" y="16" width="1" height="1" fill="#654321" />
      {/* Body */}
      <rect x="11" y="17" width="10" height="8" fill="#FFF" />
      <rect x="11" y="18" width="10" height="1" fill="#000080" />
      <rect x="11" y="20" width="10" height="1" fill="#000080" />
      <rect x="11" y="22" width="10" height="1" fill="#000080" />
      <rect x="11" y="24" width="10" height="1" fill="#000080" />
      {/* Arms - Animate */}
      <rect x="9" y={walkFrame ? "19" : "18"} width="2" height="5" fill="#FDBCB4" />
      <rect
        x="21"
        y={walkFrame ? "17" : "18"}
        width="2"
        height="5"
        fill="#FDBCB4"
      />
      {/* Legs - Animate */}
      <rect
        x="12"
        y={walkFrame ? "24" : "25"}
        width="3"
        height="5"
        fill="#654321"
      />
      <rect
        x="17"
        y={walkFrame ? "25" : "24"}
        width="3"
        height="5"
        fill="#654321"
      />
      {/* Boots - Animate */}
      <rect
        x="12"
        y={walkFrame ? "29" : "30"}
        width="3"
        height="2"
        fill="#2C1810"
      />
      <rect
        x="17"
        y={walkFrame ? "30" : "29"}
        width="3"
        height="2"
        fill="#2C1810"
      />
    </g>
  );
  const BackView = () => (
    <g>
      {/* Hat */}
      <rect x="10" y="6" width="12" height="2" fill="#2C1810" />
      <rect x="8" y="8" width="16" height="2" fill="#2C1810" />
      <rect x="14" y="6" width="4" height="2" fill="#8B0000" />
      {/* Head (back) */}
      <rect x="12" y="10" width="8" height="6" fill="#654321" />
      {/* Body */}
      <rect x="11" y="17" width="10" height="8" fill="#FFF" />
      <rect x="11" y="18" width="10" height="1" fill="#000080" />
      <rect x="11" y="20" width="10" height="1" fill="#000080" />
      <rect x="11" y="22" width="10" height="1" fill="#000080" />
      <rect x="11" y="24" width="10" height="1" fill="#000080" />
      {/* Arms - Animate */}
      <rect x="9" y={walkFrame ? "19" : "18"} width="2" height="5" fill="#FDBCB4" />
      <rect
        x="21"
        y={walkFrame ? "17" : "18"}
        width="2"
        height="5"
        fill="#FDBCB4"
      />
      {/* Legs - Animate */}
      <rect
        x="12"
        y={walkFrame ? "24" : "25"}
        width="3"
        height="5"
        fill="#654321"
      />
      <rect
        x="17"
        y={walkFrame ? "25" : "24"}
        width="3"
        height="5"
        fill="#654321"
      />
      {/* Boots - Animate */}
      <rect
        x="12"
        y={walkFrame ? "29" : "30"}
        width="3"
        height="2"
        fill="#2C1810"
      />
      <rect
        x="17"
        y={walkFrame ? "30" : "29"}
        width="3"
        height="2"
        fill="#2C1810"
      />
    </g>
  );
  const SideView = () => (
    <g>
      {/* Hat */}
      <rect x="10" y="6" width="8" height="2" fill="#2C1810" />
      <rect x="8" y="8" width="12" height="2" fill="#2C1810" />
      <rect x="10" y="6" width="4" height="2" fill="#8B0000" />
      {/* Head */}
      <rect x="10" y="10" width="6" height="6" fill="#FDBCB4" />
      {/* Nose */}
      <rect x="9" y="12" width="1" height="2" fill="#FDBCB4" />
      {/* Eye (patch side) */}
      <rect x="10" y="13" width="6" height="1" fill="#2C1810" />
      <rect x="12" y="12" width="3" height="2" fill="#2C1810" />
      {/* Beard */}
      <rect x="10" y="15" width="5" height="2" fill="#654321" />
      {/* Body */}
      <rect x="11" y="17" width="6" height="8" fill="#FFF" />
      <rect x="11" y="18" width="6" height="1" fill="#000080" />
      <rect x="11" y="20" width="6" height="1" fill="#000080" />
      <rect x="11" y="22" width="6" height="1" fill="#000080" />
      <rect x="11" y="24" width="6" height="1" fill="#000080" />
      {/* Arm (one visible) - Animate */}
      <rect
        x="13"
        y={walkFrame ? "17" : "19"}
        width="2"
        height="5"
        fill="#FDBCB4"
      />
      {/* Legs - Animate */}
      <rect
        x="14"
        y={walkFrame ? "25" : "24"}
        width="3"
        height="5"
        fill="#654321"
      />
      <rect
        x="11"
        y={walkFrame ? "24" : "25"}
        width="3"
        height="5"
        fill="#654321"
      />
      {/* Boots - Animate */}
      <rect
        x="14"
        y={walkFrame ? "30" : "29"}
        width="3"
        height="2"
        fill="#2C1810"
      />
      <rect
        x="11"
        y={walkFrame ? "29" : "30"}
        width="3"
        height="2"
        fill="#2C1810"
      />
    </g>
  );
  return (
    <svg
      viewBox="0 0 32 32"
      style={{
        width: `${32 * scale}px`,
        height: `${32 * scale}px`,
        imageRendering: "pixelated",
        transform: direction === "right" ? "scaleX(-1)" : "none",
      }}
    >
      {direction === "front" && <FrontView />}
      {direction === "back" && <BackView />}
      {(direction === "left" || direction === "right") && <SideView />}
    </svg>
  );
};

export function Viking ({ scale = 1, walkFrame = false, direction = "front" }) {
  const FrontView = () => (
    <g>
      {/* Horned helmet */}
      <rect x="8" y="4" width="2" height="4" fill="#C0C0C0" />
      <rect x="22" y="4" width="2" height="4" fill="#C0C0C0" />
      <rect x="10" y="6" width="12" height="4" fill="#C0C0C0" />
      {/* Head */}
      <rect x="11" y="10" width="10" height="6" fill="#FDBCB4" />
      {/* Eyes */}
      <rect x="13" y="12" width="2" height="2" fill="#4169E1" />
      <rect x="17" y="12" width="2" height="2" fill="#4169E1" />
      {/* Big beard */}
      <rect x="10" y="15" width="12" height="4" fill="#FF8C00" />
      <rect x="9" y="16" width="2" height="3" fill="#FF8C00" />
      <rect x="21" y="16" width="2" height="3" fill="#FF8C00" />
      {/* Body - armor */}
      <rect x="10" y="19" width="12" height="8" fill="#8B4513" />
      <rect x="11" y="20" width="2" height="2" fill="#C0C0C0" />
      <rect x="15" y="20" width="2" height="2" fill="#C0C0C0" />
      <rect x="19" y="20" width="2" height="2" fill="#C0C0C0" />
      {/* Arms - Animate */}
      <rect x="8" y={walkFrame ? "21" : "20"} width="2" height="6" fill="#FDBCB4" />
      <rect
        x="22"
        y={walkFrame ? "19" : "20"}
        width="2"
        height="6"
        fill="#FDBCB4"
      />
      {/* Legs - Animate */}
      <rect
        x="11"
        y={walkFrame ? "26" : "27"}
        width="4"
        height="4"
        fill="#654321"
      />
      <rect
        x="17"
        y={walkFrame ? "27" : "26"}
        width="4"
        height="4"
        fill="#654321"
      />
      {/* Boots - Animate */}
      <rect
        x="11"
        y={walkFrame ? "30" : "31"}
        width="4"
        height="1"
        fill="#2C1810"
      />
      <rect
        x="17"
        y={walkFrame ? "31" : "30"}
        width="4"
        height="1"
        fill="#2C1810"
      />
    </g>
  );
  const BackView = () => (
    <g>
      {/* Horned helmet */}
      <rect x="8" y="4" width="2" height="4" fill="#C0C0C0" />
      <rect x="22" y="4" width="2" height="4" fill="#C0C0C0" />
      <rect x="10" y="6" width="12" height="4" fill="#C0C0C0" />
      {/* Head (back) */}
      <rect x="11" y="10" width="10" height="6" fill="#FF8C00" />
      {/* Big beard (back) */}
      <rect x="10" y="15" width="12" height="4" fill="#FF8C00" />
      <rect x="9" y="16" width="2" height="3" fill="#FF8C00" />
      <rect x="21" y="16" width="2" height="3" fill="#FF8C00" />
      {/* Body - armor */}
      <rect x="10" y="19" width="12" height="8" fill="#8B4513" />
      {/* Arms - Animate */}
      <rect x="8" y={walkFrame ? "21" : "20"} width="2" height="6" fill="#FDBCB4" />
      <rect
        x="22"
        y={walkFrame ? "19" : "20"}
        width="2"
        height="6"
        fill="#FDBCB4"
      />
      {/* Legs - Animate */}
      <rect
        x="11"
        y={walkFrame ? "26" : "27"}
        width="4"
        height="4"
        fill="#654321"
      />
      <rect
        x="17"
        y={walkFrame ? "27" : "26"}
        width="4"
        height="4"
        fill="#654321"
      />
      {/* Boots - Animate */}
      <rect
        x="11"
        y={walkFrame ? "30" : "31"}
        width="4"
        height="1"
        fill="#2C1810"
      />
      <rect
        x="17"
        y={walkFrame ? "31" : "30"}
        width="4"
        height="1"
        fill="#2C1810"
      />
    </g>
  );
  const SideView = () => (
    <g>
      {/* Horned helmet */}
      <rect x="8" y="4" width="2" height="4" fill="#C0C0C0" />
      <rect x="10" y="6" width="8" height="4" fill="#C0C0C0" />
      {/* Head */}
      <rect x="10" y="10" width="7" height="6" fill="#FDBCB4" />
      {/* Nose */}
      <rect x="9" y="12" width="1" height="2" fill="#FDBCB4" />
      {/* Eye */}
      <rect x="12" y="12" width="2" height="2" fill="#4169E1" />
      {/* Beard */}
      <rect x="10" y="15" width="6" height="4" fill="#FF8C00" />
      <rect x="9" y="16" width="2" height="3" fill="#FF8C00" />
      {/* Body */}
      <rect x="10" y="19" width="8" height="8" fill="#8B4513" />
      {/* Arm - Animate */}
      <rect
        x="12"
        y={walkFrame ? "19" : "21"}
        width="2"
        height="6"
        fill="#FDBCB4"
      />
      {/* Legs - Animate */}
      <rect
        x="13"
        y={walkFrame ? "27" : "26"}
        width="4"
        height="4"
        fill="#654321"
      />
      <rect
        x="10"
        y={walkFrame ? "26" : "27"}
        width="4"
        height="4"
        fill="#654321"
      />
      {/* Boots - Animate */}
      <rect
        x="13"
        y={walkFrame ? "31" : "30"}
        width="4"
        height="1"
        fill="#2C1810"
      />
      <rect
        x="10"
        y={walkFrame ? "30" : "31"}
        width="4"
        height="1"
        fill="#2C1810"
      />
    </g>
  );
  return (
    <svg
      viewBox="0 0 32 32"
      style={{
        width: `${32 * scale}px`,
        height: `${32 * scale}px`,
        imageRendering: "pixelated",
        transform: direction === "right" ? "scaleX(-1)" : "none",
      }}
    >
      {direction === "front" && <FrontView />}
      {direction === "back" && <BackView />}
      {(direction === "left" || direction === "right") && <SideView />}
    </svg>
  );
};

export function Explorer ({ scale = 1, walkFrame = false, direction = "front" }) {
  const FrontView = () => (
    <g>
      {/* Safari hat */}
      <rect x="9" y="6" width="14" height="2" fill="#D2B48C" />
      <rect x="11" y="8" width="10" height="2" fill="#D2B48C" />
      <rect x="12" y="7" width="8" height="1" fill="#8B7355" />
      {/* Head */}
      <rect x="12" y="10" width="8" height="6" fill="#FDBCB4" />
      {/* Eyes */}
      <rect x="13" y="12" width="2" height="2" fill="#654321" />
      <rect x="17" y="12" width="2" height="2" fill="#654321" />
      {/* Mustache */}
      <rect x="13" y="14" width="6" height="1" fill="#654321" />
      {/* Body - khaki vest */}
      <rect x="11" y="16" width="10" height="9" fill="#C19A6B" />
      {/* Pockets */}
      <rect x="12" y="18" width="3" height="3" fill="#8B7355" />
      <rect x="17" y="18" width="3" height="3" fill="#8B7355" />
      {/* Arms - Animate */}
      <rect x="9" y={walkFrame ? "18" : "17"} width="2" height="6" fill="#D2B48C" />
      <rect
        x="21"
        y={walkFrame ? "16" : "17"}
        width="2"
        height="6"
        fill="#D2B48C"
      />
      {/* Legs - shorts - Animate */}
      <rect
        x="12"
        y={walkFrame ? "24" : "25"}
        width="3"
        height="4"
        fill="#8B7355"
      />
      <rect
        x="17"
        y={walkFrame ? "25" : "24"}
        width="3"
        height="4"
        fill="#8B7355"
      />
      {/* Boots - Animate */}
      <rect
        x="11"
        y={walkFrame ? "28" : "29"}
        width="4"
        height="3"
        fill="#654321"
      />
      <rect
        x="17"
        y={walkFrame ? "29" : "28"}
        width="4"
        height="3"
        fill="#654321"
      />
    </g>
  );
  const BackView = () => (
    <g>
      {/* Safari hat */}
      <rect x="9" y="6" width="14" height="2" fill="#D2B48C" />
      <rect x="11" y="8" width="10" height="2" fill="#D2B48C" />
      <rect x="12" y="7" width="8" height="1" fill="#8B7355" />
      {/* Head (back) */}
      <rect x="12" y="10" width="8" height="6" fill="#654321" />
      {/* Body - khaki vest */}
      <rect x="11" y="16" width="10" height="9" fill="#C19A6B" />
      {/* Arms - Animate */}
      <rect x="9" y={walkFrame ? "18" : "17"} width="2" height="6" fill="#D2B48C" />
      <rect
        x="21"
        y={walkFrame ? "16" : "17"}
        width="2"
        height="6"
        fill="#D2B48C"
      />
      {/* Legs - shorts - Animate */}
      <rect
        x="12"
        y={walkFrame ? "24" : "25"}
        width="3"
        height="4"
        fill="#8B7355"
      />
      <rect
        x="17"
        y={walkFrame ? "25" : "24"}
        width="3"
        height="4"
        fill="#8B7355"
      />
      {/* Boots - Animate */}
      <rect
        x="11"
        y={walkFrame ? "28" : "29"}
        width="4"
        height="3"
        fill="#654321"
      />
      <rect
        x="17"
        y={walkFrame ? "29" : "28"}
        width="4"
        height="3"
        fill="#654321"
      />
    </g>
  );
  const SideView = () => (
    <g>
      {/* Safari hat */}
      <rect x="9" y="6" width="12" height="2" fill="#D2B48C" />
      <rect x="11" y="8" width="8" height="2" fill="#D2B48C" />
      <rect x="12" y="7" width="6" height="1" fill="#8B7355" />
      {/* Head */}
      <rect x="11" y="10" width="6" height="6" fill="#FDBCB4" />
      {/* Nose */}
      <rect x="10" y="12" width="1" height="2" fill="#FDBCB4" />
      {/* Eye */}
      <rect x="13" y="12" width="2" height="2" fill="#654321" />
      {/* Mustache */}
      <rect x="10" y="14" width="4" height="1" fill="#654321" />
      {/* Body - khaki vest */}
      <rect x="12" y="16" width="7" height="9" fill="#C19A6B" />
      {/* Pocket */}
      <rect x="13" y="18" width="3" height="3" fill="#8B7355" />
      {/* Arm - Animate */}
      <rect
        x="14"
        y={walkFrame ? "16" : "18"}
        width="2"
        height="6"
        fill="#D2B48C"
      />
      {/* Legs - shorts - Animate */}
      <rect
        x="15"
        y={walkFrame ? "25" : "24"}
        width="3"
        height="4"
        fill="#8B7355"
      />
      <rect
        x="12"
        y={walkFrame ? "24" : "25"}
        width="3"
        height="4"
        fill="#8B7355"
      />
      {/* Boots - Animate */}
      <rect
        x="14"
        y={walkFrame ? "29" : "28"}
        width="4"
        height="3"
        fill="#654321"
      />
      <rect
        x="11"
        y={walkFrame ? "28" : "29"}
        width="4"
        height="3"
        fill="#654321"
      />
    </g>
  );
  return (
    <svg
      viewBox="0 0 32 32"
      style={{
        width: `${32 * scale}px`,
        height: `${32 * scale}px`,
        imageRendering: "pixelated",
        transform: direction === "right" ? "scaleX(-1)" : "none",
      }}
    >
      {direction === "front" && <FrontView />}
      {direction === "back" && <BackView />}
      {(direction === "left" || direction === "right") && <SideView />}
    </svg>
  );
};

export function Castaway ({ scale = 1, walkFrame = false, direction = "front" })  {
  const FrontView = () => (
    <g>
      {/* Messy hair */}
      <rect x="10" y="6" width="12" height="4" fill="#654321" />
      <rect x="9" y="7" width="2" height="2" fill="#654321" />
      <rect x="21" y="7" width="2" height="2" fill="#654321" />
      {/* Head - sunburned */}
      <rect x="12" y="10" width="8" height="6" fill="#E69B8B" />
      {/* Eyes - tired */}
      <rect x="13" y="12" width="2" height="1" fill="#000" />
      <rect x="17" y="12" width="2" height="1" fill="#000" />
      {/* Beard stubble */}
      <rect x="13" y="14" width="6" height="2" fill="#8B7355" opacity="0.5" />
      {/* Body - torn shirt */}
      <rect x="11" y="16" width="10" height="8" fill="#D2B48C" />
      <rect x="13" y="18" width="2" height="3" fill="#FFF" opacity="0.3" />
      <rect x="17" y="20" width="2" height="2" fill="#FFF" opacity="0.3" />
      {/* Arms - sunburned - Animate */}
      <rect x="9" y={walkFrame ? "18" : "17"} width="2" height="6" fill="#E69B8B" />
      <rect
        x="21"
        y={walkFrame ? "16" : "17"}
        width="2"
        height="6"
        fill="#E69B8B"
      />
      {/* Legs - tattered pants - Animate */}
      <rect
        x="12"
        y={walkFrame ? "23" : "24"}
        width="3"
        height="6"
        fill="#8B7355"
      />
      <rect
        x="17"
        y={walkFrame ? "24" : "23"}
        width="3"
        height="6"
        fill="#8B7355"
      />
      {/* Barefoot - Animate */}
      <rect
        x="12"
        y={walkFrame ? "29" : "30"}
        width="3"
        height="2"
        fill="#E69B8B"
      />
      <rect
        x="17"
        y={walkFrame ? "30" : "29"}
        width="3"
        height="2"
        fill="#E69B8B"
      />
    </g>
  );
  const BackView = () => (
    <g>
      {/* Messy hair */}
      <rect x="10" y="6" width="12" height="4" fill="#654321" />
      <rect x="9" y="7" width="2" height="2" fill="#654321" />
      <rect x="21" y="7" width="2" height="2" fill="#654321" />
      <rect x="12" y="10" width="8" height="6" fill="#654321" />
      {/* Body - torn shirt */}
      <rect x="11" y="16" width="10" height="8" fill="#D2B48C" />
      <rect x="13" y="18" width="2" height="3" fill="#FFF" opacity="0.3" />
      <rect x="17" y="20" width="2" height="2" fill="#FFF" opacity="0.3" />
      {/* Arms - sunburned - Animate */}
      <rect x="9" y={walkFrame ? "18" : "17"} width="2" height="6" fill="#E69B8B" />
      <rect
        x="21"
        y={walkFrame ? "16" : "17"}
        width="2"
        height="6"
        fill="#E69B8B"
      />
      {/* Legs - tattered pants - Animate */}
      <rect
        x="12"
        y={walkFrame ? "23" : "24"}
        width="3"
        height="6"
        fill="#8B7355"
      />
      <rect
        x="17"
        y={walkFrame ? "24" : "23"}
        width="3"
        height="6"
        fill="#8B7355"
      />
      {/* Barefoot - Animate */}
      <rect
        x="12"
        y={walkFrame ? "29" : "30"}
        width="3"
        height="2"
        fill="#E69B8B"
      />
      <rect
        x="17"
        y={walkFrame ? "30" : "29"}
        width="3"
        height="2"
        fill="#E69B8B"
      />
    </g>
  );
  const SideView = () => (
    <g>
      {/* Messy hair */}
      <rect x="10" y="6" width="10" height="4" fill="#654321" />
      <rect x="9" y="7" width="2" height="2" fill="#654321" />
      {/* Head */}
      <rect x="11" y="10" width="6" height="6" fill="#E69B8B" />
      {/* Nose */}
      <rect x="10" y="12" width="1" height="2" fill="#E69B8B" />
      {/* Eye */}
      <rect x="13" y="12" width="2" height="1" fill="#000" />
      {/* Beard stubble */}
      <rect x="11" y="14" width="4" height="2" fill="#8B7355" opacity="0.5" />
      {/* Body - torn shirt */}
      <rect x="12" y="16" width="7" height="8" fill="#D2B48C" />
      <rect x="14" y="18" width="2" height="3" fill="#FFF" opacity="0.3" />
      {/* Arm - Animate */}
      <rect
        x="14"
        y={walkFrame ? "16" : "18"}
        width="2"
        height="6"
        fill="#E69B8B"
      />
      {/* Legs - tattered pants - Animate */}
      <rect
        x="15"
        y={walkFrame ? "24" : "23"}
        width="3"
        height="6"
        fill="#8B7355"
      />
      <rect
        x="12"
        y={walkFrame ? "23" : "24"}
        width="3"
        height="6"
        fill="#8B7355"
      />
      {/* Barefoot - Animate */}
      <rect
        x="15"
        y={walkFrame ? "30" : "29"}
        width="3"
        height="2"
        fill="#E69B8B"
      />
      <rect
        x="12"
        y={walkFrame ? "29" : "30"}
        width="3"
        height="2"
        fill="#E69B8B"
      />
    </g>
  );
  return (
    <svg
      viewBox="0 0 32 32"
      style={{
        width: `${32 * scale}px`,
        height: `${32 * scale}px`,
        imageRendering: "pixelated",
        transform: direction === "right" ? "scaleX(-1)" : "none",
      }}
    >
      {direction === "front" && <FrontView />}
      {direction === "back" && <BackView />}
      {(direction === "left" || direction === "right") && <SideView />}
    </svg>
  );
};