import React, { useState } from "react";

const PatchNotesGenerator = () => {
  const [version, setVersion] = useState("v1.0.0");
  const [date, setDate] = useState("March 2, 2026");
  const [title, setTitle] = useState("Season 1 Update");
  const [intro, setIntro] = useState("");

  // Default sections
  const [sections, setSections] = useState([
    {
      id: 1,
      title: "General Updates",
      items: "Increased typing base speed by 5%\nOptimized matchmaking times",
    },
    {
      id: 2,
      title: "Bug Fixes",
      items:
        "Fixed a glitch where user avatars wouldn't load\nResolved an issue with the leaderboard desync",
    },
  ]);

  const [generatedCode, setGeneratedCode] = useState("");
  const [copyText, setCopyText] = useState("Copy Code to Clipboard");

  const handleAddSection = () => {
    setSections([...sections, { id: Date.now(), title: "", items: "" }]);
  };

  const handleRemoveSection = (idToRemove) => {
    setSections(sections.filter((sec) => sec.id !== idToRemove));
  };

  const handleSectionChange = (id, field, value) => {
    setSections(
      sections.map((sec) => (sec.id === id ? { ...sec, [field]: value } : sec)),
    );
  };

  const generateCode = () => {
    const validSections = sections.filter(
      (sec) => sec.title.trim() || sec.items.trim(),
    );

    let code = `import "./PatchNotes.css";\n\n`;
    code += `<div className="patch-notes-container">\n`;

    // Header
    code += `  <header className="patch-header">\n`;
    code += `    <div className="patch-header-top">\n`;
    code += `      <span>${version}</span>\n`;
    code += `      <span>${date}</span>\n`;
    code += `    </div>\n`;
    code += `    <h1 className="patch-title">${title}</h1>\n`;
    code += `  </header>\n\n`;

    // Intro
    if (intro.trim()) {
      code += `  <div className="patch-intro">\n`;
      code += `    <p>${intro}</p>\n`;
      code += `  </div>\n\n`;
    }

    // Sections
    code += `  <div className="patch-sections">\n`;

    validSections.forEach((sec, index) => {
      const itemsArray = sec.items.split("\n").filter((i) => i.trim() !== "");

      code += `    <section key="${index}">\n`;
      code += `      <h2 className="patch-section-title">${sec.title.toUpperCase()}</h2>\n`;

      code += `      <ul className="patch-list">\n`;

      itemsArray.forEach((item) => {
        const cleanItem = item.replace(/"/g, "&quot;");
        code += `        <li>${cleanItem}</li>\n`;
      });

      code += `      </ul>\n`;

      code += `    </section>\n`;
    });

    code += `  </div>\n`;
    code += `</div>`;

    setGeneratedCode(code);
  };

  const copyCode = () => {
    if (!generatedCode) {
      alert("Generate some code first!");
      return;
    }
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopyText("Copied! ✔️");
      setTimeout(() => setCopyText("Copy Code to Clipboard"), 2000);
    });
  };

  // --- Inline Styles for the Generator UI ---
  const styles = {
    container: {
      display: "flex",
      flexWrap: "wrap",
      gap: "2rem",
      maxWidth: "1400px",
      margin: "0 auto",
      justifyContent: "center",
      padding: "20px",
      color: "white",
      fontFamily: "'Cabin', sans-serif",
    },
    panel: {
      border: "3px solid #14adffab",
      backgroundColor: "#161616",
      boxShadow: "0 0 8px rgba(14, 165, 233, 0.6)",
      borderRadius: "8px",
      padding: "30px",
      flex: 1,
      minWidth: "400px",
      display: "flex",
      flexDirection: "column",
      gap: "15px",
    },
    label: {
      fontWeight: "bold",
      color: "#14adffab",
      marginBottom: "5px",
      display: "block",
    },
    input: {
      backgroundColor: "#212121",
      border: "1px solid #14adffab",
      color: "white",
      fontFamily: "'Cabin', sans-serif",
      padding: "10px",
      borderRadius: "4px",
      width: "100%",
      boxSizing: "border-box",
      outline: "none",
      marginBottom: "15px",
    },
    button: {
      backgroundColor: "transparent",
      border: "2px solid #14adffab",
      color: "white",
      padding: "10px 20px",
      borderRadius: "4px",
      cursor: "pointer",
      fontFamily: "'Cabin', sans-serif",
      fontWeight: "bold",
      textTransform: "uppercase",
      letterSpacing: "1px",
      transition: "all 0.2s ease",
      marginTop: "10px",
    },
    generateBtn: {
      backgroundColor: "#14adffab",
      color: "#161616",
      marginTop: "30px",
    },
    sectionBlock: {
      backgroundColor: "#212121",
      border: "1px dashed #14adffab",
      padding: "15px",
      borderRadius: "4px",
      position: "relative",
      marginBottom: "10px",
    },
    removeBtn: {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "#ff4d4d",
      border: "none",
      padding: "5px 10px",
      fontSize: "12px",
      color: "white",
      cursor: "pointer",
      borderRadius: "4px",
    },
    textareaOutput: {
      height: "450px",
      whiteSpace: "pre",
      overflowX: "auto",
      resize: "vertical",
      fontFamily: "monospace",
      fontSize: "14px",
      backgroundColor: "#212121",
      border: "1px solid #14adffab",
      color: "#aaffaa",
      padding: "10px",
      borderRadius: "4px",
      width: "100%",
      boxSizing: "border-box",
    },
  };

  return (
    <div style={styles.container}>
      {/* Left Panel: Form */}
      <div style={styles.panel}>
        <h1 style={{ margin: "0 0 20px 0" }}>🛠️ Build Patch Notes</h1>

        <div>
          <label style={styles.label}>Patch Version</label>
          <input
            style={styles.input}
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g., v1.02.4"
          />
        </div>

        <div>
          <label style={styles.label}>Patch Date</label>
          <input
            style={styles.input}
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="e.g., March 2, 2026"
          />
        </div>

        <div>
          <label style={styles.label}>Main Title</label>
          <input
            style={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., The Awakening Update"
          />
        </div>

        <div>
          <label style={styles.label}>Introduction/Summary</label>
          <textarea
            style={{ ...styles.input, resize: "vertical" }}
            rows="3"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="Write a short intro about what this patch focuses on..."
          ></textarea>
        </div>

        <div
          style={{
            borderTop: "1px solid #14adffab",
            marginTop: "10px",
            paddingTop: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 5px 0" }}>Patch Sections</h3>
          <p style={{ fontSize: "0.9em", color: "#aaa", margin: "0 0 15px 0" }}>
            Like "Weapon Balance", "Bug Fixes", etc.
          </p>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {sections.map((sec) => (
              <div key={sec.id} style={styles.sectionBlock}>
                <button
                  style={styles.removeBtn}
                  onClick={() => handleRemoveSection(sec.id)}
                >
                  X
                </button>
                <label style={styles.label}>Category Title</label>
                <input
                  style={styles.input}
                  type="text"
                  value={sec.title}
                  onChange={(e) =>
                    handleSectionChange(sec.id, "title", e.target.value)
                  }
                  placeholder="e.g., Bug Fixes"
                />
                <label style={styles.label}>Bullet Points (One per line)</label>
                <textarea
                  style={{
                    ...styles.input,
                    marginBottom: 0,
                    resize: "vertical",
                  }}
                  rows="4"
                  value={sec.items}
                  onChange={(e) =>
                    handleSectionChange(sec.id, "items", e.target.value)
                  }
                  placeholder="Item 1\nItem 2\nItem 3"
                ></textarea>
              </div>
            ))}
          </div>
          <button style={styles.button} onClick={handleAddSection}>
            + Add Category
          </button>
        </div>

        <button
          style={{ ...styles.button, ...styles.generateBtn }}
          onClick={generateCode}
        >
          Generate JSX
        </button>
      </div>

      {/* Right Panel: Output */}
      <div style={styles.panel}>
        <h1 style={{ margin: "0 0 5px 0" }}>💻 Generated JSX</h1>
        <p style={{ color: "#aaa", fontSize: "0.9em", margin: "0 0 20px 0" }}>
          Copy and paste this massive `&lt;div&gt;` directly into your existing
          React file.
        </p>

        <textarea
          style={styles.textareaOutput}
          readOnly
          value={generatedCode}
        ></textarea>

        <button
          style={{
            ...styles.button,
            backgroundColor: copyText.includes("Copied")
              ? "#14adffab"
              : "transparent",
            color: copyText.includes("Copied") ? "#161616" : "white",
          }}
          onClick={copyCode}
        >
          {copyText}
        </button>
      </div>
    </div>
  );
};

export default PatchNotesGenerator;
