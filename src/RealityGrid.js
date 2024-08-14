/**
 * RealityGrid.js
 *
 * This file defines the RealityGrid class, which extends the Grid class to integrate a hierarchical grid system
 * with a Three.js scene. The RealityGrid class manages entities within a 3D scene, allows for the addition
 * of wireframe geometries, and handles rendering using the Three.js library. It provides an interface for creating,
 * managing, and rendering 3D objects in a structured grid format, with the ability to transform and manipulate
 * these objects in a 3D space.
 */

import { Scene, WireframeGeometry, LineSegments } from "three";
import GridEntity from "./GridEntity.js";
import Grid from "./Grid.js";

class RealityGrid extends Grid {
  constructor(options = {}) {
    super(options);
    this.scene = options.scene || new Scene(); // Use the provided Three.js scene or create a new one
    this.renderer = options.renderer; // Store the renderer instance, which will be used for rendering the scene
    this.camera = options.camera; // Store the camera instance, which defines the perspective for rendering
    this.grid = null; // RealityGrid cannot be a child of another grid, so set this to null
    this.addDestination = "scene"; // Specify that new entities should be added to the scene
  }

  /**
   * Creates a GridEntity object and adds it to this grid.
   * @param  {...any} args - Arguments to be passed to the GridEntity constructor.
   * @returns {GridEntity} - The created GridEntity object.
   */
  makeGridEntity(...args) {
    const gridObj = new GridEntity(...args); // Create a new GridEntity with provided arguments
    this.add(gridObj); // Add the newly created GridEntity to the grid
    return gridObj; // Return the created GridEntity
  }

  /**
   * Adds a wireframe representation of a given geometry to the scene.
   * This is useful for visualizing the structure of geometries in the scene.
   * @param {THREE.Geometry} geometry - The geometry to create a wireframe for.
   */
  addGeometryWireframe(geometry) {
    const wireframe = new WireframeGeometry(geometry); // Create a wireframe geometry from the provided geometry
    const line = new LineSegments(wireframe); // Create line segments from the wireframe
    line.material.depthTest = false; // Disable depth testing to ensure the wireframe is always visible
    line.material.opacity = 0.25; // Set the wireframe's opacity to 25% (semi-transparent)
    line.material.transparent = true; // Enable transparency for the wireframe material
    this.scene.add(line); // Add the wireframe line segments to the scene
  }

  /**
   * Gets the global position of a mesh within the scene.
   * @param {THREE.Vector3} pos - The local position vector.
   * @param {THREE.Mesh} mesh - The mesh whose global position is to be calculated.
   * @returns {THREE.Vector3} - The global position of the mesh.
   */
  getPosition(pos, mesh) {
    this.scene.updateMatrixWorld(true); // Update the scene's world matrix to ensure transformations are up-to-date
    const globalPos = pos.clone().setFromMatrixPosition(mesh.matrixWorld); // Calculate the global position based on the mesh's world matrix
    return globalPos; // Return the global position of the mesh
  }

  /**
   * Renders the scene using the stored renderer and camera.
   * This method should be called in a render loop to continuously display the scene.
   */
  render() {
    this.renderer.render(this.scene, this.camera); // Render the scene from the perspective of the camera
  }
}

export default RealityGrid;
