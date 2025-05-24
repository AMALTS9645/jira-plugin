import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
// Using Lucide React icons directly
import { ZoomIn, ZoomOut, Target } from "lucide-react";

const GraphComponent = ({ data }) => {
  const svgRef = useRef(null);
  const fixedNodes = useRef(new Map()); // To track fixed nodes
  const zoomBehavior = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    // Clear the previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Remove all previous elements

    const width = window.innerWidth; // Use window width
    const height = window.innerHeight; // Use window height

    svg
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const svgGroup = svg.append("g"); // Group for pan and zoom

    // Add a subtle grid pattern for better visual orientation
    const gridSize = 50;
    const gridGroup = svgGroup.append("g").attr("class", "grid");
    
    // Add horizontal grid lines
    gridGroup
      .selectAll(".grid-line-h")
      .data(d3.range(0, height, gridSize))
      .enter()
      .append("line")
      .attr("class", "grid-line-h")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => d)
      .attr("y2", d => d)
      .attr("stroke", "#f0f0f0")
      .attr("stroke-width", 1);
      
    // Add vertical grid lines
    gridGroup
      .selectAll(".grid-line-v")
      .data(d3.range(0, width, gridSize))
      .enter()
      .append("line")
      .attr("class", "grid-line-v")
      .attr("x1", d => d)
      .attr("x2", d => d)
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#f0f0f0")
      .attr("stroke-width", 1);

    const { nodes, relationships } = data;

    zoomBehavior.current = d3.zoom()
      .scaleExtent([0.1, 3]) // Set min and max zoom levels
      .on("zoom", (event) => {
        svgGroup.attr("transform", event.transform); // Apply zoom/pan transformations
      });

    // Apply zoom behavior to the svg
    svg.call(zoomBehavior.current);

    // ---- Define arrowhead marker with improved styling ----
    const defs = svg.append("defs");
    
    // Define gradient for links
    const linkGradient = defs.append("linearGradient")
      .attr("id", "linkGradient")
      .attr("gradientUnits", "userSpaceOnUse");
      
    linkGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#6366f1");
      
    linkGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#8b5cf6");

    // Define arrow marker with improved styling
    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28) // Position the arrowhead
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5") // Shape of the arrowhead
      .attr("fill", "#8b5cf6"); // Color of the arrowhead

    // Add drop shadow filter for nodes
    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "130%");

    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 3)
      .attr("result", "blur");

    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 2)
      .attr("dy", 2)
      .attr("result", "offsetBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
      .attr("in", "offsetBlur");
    feMerge.append("feMergeNode")
      .attr("in", "SourceGraphic");
      
    // Add drop shadow filter for relationship labels
    const labelShadow = defs.append("filter")
      .attr("id", "label-shadow")
      .attr("height", "130%");
      
    labelShadow.append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 0)
      .attr("stdDeviation", 2)
      .attr("flood-color", "white")
      .attr("flood-opacity", 0.8);

    // Set up scales and simulation with improved forces
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(relationships)
          .id((d) => d.id)
          .distance(200) // Adjusted distance for better layout
      )
      .force("charge", d3.forceManyBody().strength(-300)) // Stronger repulsion
      .force("collide", d3.forceCollide().radius(80)) // Adjust collision radius
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.05)) // Gentle force toward center X
      .force("y", d3.forceY(height / 2).strength(0.05)); // Gentle force toward center Y

    // Create link group for better organization
    const linkGroup = svgGroup.append("g").attr("class", "links");

    // Add curved edges with gradient
    const linkElements = linkGroup
      .selectAll("path")
      .data(relationships)
      .enter()
      .append("path")
      .attr("stroke", "url(#linkGradient)")
      .attr("stroke-width", 2)
      .attr("fill", "none")
      .attr("opacity", 0.7)
      .attr("marker-end", "url(#arrow)")
      .attr("stroke-linecap", "round");

    // First add label backgrounds for improved readability
    const labelBackgrounds = svgGroup
      .append("g")
      .attr("class", "label-backgrounds")
      .selectAll("rect")
      .data(relationships)
      .enter()
      .append("rect")
      .attr("fill", "white")
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("opacity", 0.9)
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 1)
      .attr("filter", "url(#drop-shadow)")
      .attr("pointer-events", "none"); // Prevent interfering with interactions

    // Add relationship type labels with improved styling
    const relationshipLabels = svgGroup
      .append("g")
      .attr("class", "relationship-labels")
      .selectAll("text")
      .data(relationships)
      .enter()
      .append("text")
      .attr("font-size", 12)
      .attr("font-weight", "600")
      .attr("fill", "#4b5563")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("pointer-events", "none"); // Prevent interfering with interactions

    // Create node group for better organization
    const nodeGroup = svgGroup.append("g").attr("class", "nodes");

    // Add node backgrounds (larger circles) for better aesthetics
    const nodeBackgrounds = nodeGroup
      .selectAll(".node-background")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", "node-background")
      .attr("r", 55)
      .attr("fill", "white")
      .attr("opacity", 0.6)
      .attr("filter", "url(#drop-shadow)");

    // Add nodes with improved styling
    const nodeElements = nodeGroup
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", 50)
      .attr("fill", (d) => {
        // Check if node.labels contains "Issue"
        if (d.labels && d.labels.includes("Issue")) {
          return "rgba(248, 113, 113, 0.9)"; // Red for Issue nodes
        }
        return "rgba(96, 165, 250, 0.9)"; // Blue for other nodes
      })
      .attr("stroke", (d) => {
        if (d.labels && d.labels.includes("Issue")) {
          return "#ef4444"; // Red border for Issue nodes
        }
        return "#3b82f6"; // Blue border for other nodes
      })
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        handleNodeClick(event, d);
        setSelectedNode(d);
      })
      .on("mouseover", function() {
        d3.select(this).transition().duration(300).attr("r", 55);
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(300).attr("r", 50);
      })
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            if (!fixedNodes.current.has(d.id)) {
              d.fx = d.x;
              d.fy = d.y;
            }
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
          })
      );

    // Add labels to nodes with improved styling
    const textElements = nodeGroup
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("font-size", 14)
      .attr("font-weight", "600")
      .attr("fill", "#1f2937")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("pointer-events", "none") // Prevent interfering with node interactions
      .text((d) => d.properties.id);

    // Set the text content after the elements are created
    relationshipLabels.text((d) => d.type);

    // Update positions on every tick with curved edges
    simulation.on("tick", () => {
      // Update curved links
      linkElements.attr("d", (d) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2; // Curve strength
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      // Update node positions
      nodeElements.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      nodeBackgrounds.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      textElements.attr("x", (d) => d.x).attr("y", (d) => d.y);

      // Update relationship labels position
      relationshipLabels
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);

      // Update label backgrounds with better sizing and positioning
      const paddingX = 15;
      const paddingY = 8;
      
      relationshipLabels.each(function(d, i) {
        const bbox = this.getBBox();
        labelBackgrounds
          .filter((_, idx) => idx === i)
          .attr("x", bbox.x - paddingX)
          .attr("y", bbox.y - paddingY)
          .attr("width", bbox.width + (paddingX * 2))
          .attr("height", bbox.height + (paddingY * 2));
      });
    });

    // Initial zoom settings for better initial view
    const initialScale = 0.3;
    const initialTranslate = [width / 2, height / 2];

    // Apply the zoom transformation to the svgGroup for the zoomed-out view
    svg.call(
      zoomBehavior.current.transform,
      d3.zoomIdentity
        .translate(initialTranslate[0], initialTranslate[1])
        .scale(initialScale)
    );

    // Enhanced highlighting logic
    function handleNodeClick(event, clickedNode) {
      // Reset styles for all nodes and links
      nodeElements.attr("fill", d => {
        if (d.labels && d.labels.includes("Issue")) {
          return "rgba(248, 113, 113, 0.9)";
        }
        return "rgba(96, 165, 250, 0.9)";
      }).attr("stroke", d => {
        if (d.labels && d.labels.includes("Issue")) {
          return "#ef4444";
        }
        return "#3b82f6";
      });
      
      linkElements.attr("stroke", "url(#linkGradient)").attr("stroke-width", 2).attr("opacity", 0.7);
      relationshipLabels.attr("fill", "#4b5563").attr("font-weight", "600");
      labelBackgrounds.attr("fill", "white").attr("stroke", "#e5e7eb");

      // Determine if the node is already fixed
      const isFixed = fixedNodes.current.has(clickedNode.id);

      if (isFixed) {
        // Release the node from fixed position
        fixedNodes.current.delete(clickedNode.id);
        clickedNode.fx = null;
        clickedNode.fy = null;
      } else {
        // Highlight the clicked node with animated transition
        d3.select(event.currentTarget)
          .transition()
          .duration(300)
          .attr("fill", "rgba(249, 168, 37, 0.9)")
          .attr("stroke", "#f59e0b")
          .attr("stroke-width", 3);
          
        fixedNodes.current.set(clickedNode.id, clickedNode);
        clickedNode.fx = clickedNode.x;
        clickedNode.fy = clickedNode.y;

        // Get the relationships connected to the clicked node
        const linkedLinks = relationships.filter(
          (link) =>
            link.source.id === clickedNode.id ||
            link.target.id === clickedNode.id
        );

        // Get the nodes connected to the clicked node
        const connectedNodeIds = new Set();
        linkedLinks.forEach(link => {
          connectedNodeIds.add(link.source.id);
          connectedNodeIds.add(link.target.id);
        });

        // Highlight the connected links with animated transition
        linkElements
          .filter((link) => linkedLinks.includes(link))
          .transition()
          .duration(300)
          .attr("stroke", "#f59e0b")
          .attr("stroke-width", 3)
          .attr("opacity", 1);

        // Highlight the connected nodes with animated transition
        nodeElements
          .filter((node) => connectedNodeIds.has(node.id))
          .transition()
          .duration(300)
          .attr("fill", "rgba(249, 168, 37, 0.6)")
          .attr("stroke", "#f59e0b");
          
        // Highlight relationship labels for connected links
        relationshipLabels
          .filter((link) => linkedLinks.includes(link))
          .transition()
          .duration(300)
          .attr("fill", "#000")
          .attr("font-weight", "700");
          
        // Highlight label backgrounds for connected links  
        labelBackgrounds
          .filter((link) => linkedLinks.includes(link))
          .transition()
          .duration(300)
          .attr("fill", "#fffbeb")
          .attr("stroke", "#f59e0b");
      }
    }
  }, [data]);

  // Function to zoom in with smoother animation
  const zoomIn = () => {
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomBehavior.current.scaleBy, 1.5);
  };

  // Function to zoom out with smoother animation
  const zoomOut = () => {
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomBehavior.current.scaleBy, 0.7);
  };

  // Function to reset zoom with smoother animation
  const resetZoom = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(
        zoomBehavior.current.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(0.3)
      );
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-gray-50 overflow-hidden">
      {/* Graph SVG with fixed layout */}
      <svg ref={svgRef} className="w-full h-full"></svg>
      
      {/* Node info panel - positioned at the top left with absolute positioning */}
      {selectedNode && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-4 max-w-xs z-10">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg">{selectedNode.properties.id}</h3>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedNode(null)}
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            {selectedNode.labels?.join(", ") || "No labels"}
          </div>
          <div className="space-y-1">
            {Object.entries(selectedNode.properties || {}).map(([key, value]) => (
              key !== "id" && (
                <div key={key} className="grid grid-cols-3 gap-1">
                  <span className="text-xs font-medium text-gray-500">{key}:</span>
                  <span className="text-sm col-span-2">{value}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Control buttons - fixed vertical layout at bottom right */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={zoomIn}
          className="bg-white w-10 h-10 rounded shadow flex items-center justify-center hover:bg-gray-100"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={zoomOut}
          className="bg-white w-10 h-10 rounded shadow flex items-center justify-center hover:bg-gray-100"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={resetZoom}
          className="bg-white w-10 h-10 rounded shadow flex items-center justify-center hover:bg-gray-100"
          title="Reset View"
        >
          <Target size={20} />
        </button>
      </div>
    </div>
  );
};

export default GraphComponent;