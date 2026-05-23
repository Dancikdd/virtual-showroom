export const config = {
  label:          'Grasslands',
  color:          0x8844ff,
  scale:          1,
  offsetY:        0,
  animation:      'orbit',
  showGalaxy:     false,
  staticOptimize: true,

  extraModels: [
    {
      modelPath: '/products/jabami_anime_tree_v2.glb',
      scale:     1,
      offsetY:   0,
      position:  { x: 80, y: 0, z: -50 },   
      rotation:  { x: 0,  y: 0, z: 0 },
    },
    {
      modelPath: '/products/pink_flower_petal_3d_model.glb',
      scale:     0.5,
      offsetY:   0,
      position:  { x: -60, y: 0, z: 30 },
    },
  ],
};