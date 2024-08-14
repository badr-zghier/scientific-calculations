/**
 * Grid.js
 *
 * This file defines the Grid class, which extends the GridEntity class to manage a hierarchical structure of grid entities.
 * The Grid class provides functionality for adding, updating, and managing child entities, which can be other grids
 * or individual grid elements. It allows for organizing entities within a 3D space, setting boundaries, and moving
 * entities as a group. This class serves as a foundation for more complex grid-based systems like the RealityGrid.
 */

import GridEntity from "./GridEntity.js";

class Grid extends GridEntity {
  constructor(options = {}) {
    super(options);
    this.children = []; // Initialize an array to hold child grid entities
    this.addDestination = "mesh"; // Set the default destination for adding new objects to 'mesh'
    this.boundaries = {
      x: [-Infinity, Infinity],
      y: [-Infinity, Infinity],
      z: [-Infinity, Infinity],
    }; // Define default infinite boundaries for the grid
  }

  /**
   * Sets boundaries for the grid along the x, y, and z axes.
   * This method allows restricting the space within which grid entities can exist.
   * @param {Array} x - The boundary range for the x-axis (e.g., [minX, maxX]).
   * @param {Array} y - The boundary range for the y-axis (e.g., [minY, maxY]).
   * @param {Array} z - The boundary range for the z-axis (e.g., [minZ, maxZ]).
   */
  setBoundaries(x, y, z) {
    if (x) this.boundaries.x = x; // Update the x-axis boundaries if provided
    if (y) this.boundaries.y = y; // Update the y-axis boundaries if provided
    if (z) this.boundaries.z = z; // Update the z-axis boundaries if provided
  }

  /**
   * Adds a GridEntity object to this grid.
   * The added object becomes a child of this grid, and its mesh (if present) is added to the appropriate destination.
   * @param {GridEntity} gridObj - The grid entity to be added.
   */
  add(gridObj) {
    if (!(gridObj instanceof GridEntity))
      console.warn(gridObj, "not a GridEntity"); // Warn if the object is not a GridEntity
    this.children.push(gridObj); // Add the grid entity to the list of children
    gridObj.grid = this; // Set this grid as the parent of the grid entity
    if (gridObj.mesh) {
      // If the grid entity has a mesh
      this[this.addDestination].add(gridObj.mesh); // Add the mesh to the specified destination (either 'mesh' or 'scene')
    }
  }

  /**
   * Updates all child entities of this grid.
   * This method is called during the grid's update cycle to propagate updates to all children.
   * @param {number} t - The current time (or frame number).
   * @param {number} now - The current timestamp.
   */
  updateChildren(t, now) {
    this.children.forEach((child) => {
      if (child.update) child.update(t, now); // If the child has an update method, call it
    });
  }

  /**
   * Updates this grid and all its child entities.
   * This method can be overridden to include additional update logic.
   * @param {number} t - The current time (or frame number).
   * @param {number} now - The current timestamp.
   */
  update(t, now) {
    this.updateChildren(t, now); // Update all child entities
  }

  /**
   * Moves all children of this grid by a given vector, with optional exclusions.
   * This method is useful for translating multiple entities at once.
   * @param {THREE.Vector3} vec3 - The vector by which to move the children.
   * @param {Object} options - Options to control the movement, such as excluding certain children.
   */
  moveChildren(vec3, options = {}) {
    this.children.forEach((child) => {
      if (options.except) {
        if (options.except.includes(child)) return; // Skip children specified in the 'except' option
      }
      child.move(vec3); // Move the child by the provided vector
    });
  }
}

export default Grid;
