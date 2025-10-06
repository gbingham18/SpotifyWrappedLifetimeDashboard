# typed: false

# Be sure to restart your server when you modify this file.

# Version of your assets, change this if you want to expire all your assets.
Rails.application.config.assets.version = "1.0"

# Add additional assets to the asset load path.
# Rails.application.config.assets.paths << Emoji.images_path
# config/initializers/assets.rb
Rails.application.config.assets.precompile += %w[ controllers/hello_controller.js ]
Rails.application.config.assets.precompile += %w[ controllers/index.js ]
Rails.application.config.assets.precompile += %w[ bar_chart.js ]
Rails.application.config.assets.precompile += %w[ d3.js ]
Rails.application.config.assets.precompile += %w[ d3-array.js ]
Rails.application.config.assets.precompile += %w[ d3-axis.js ]
Rails.application.config.assets.precompile += %w[ d3-brush.js ]
Rails.application.config.assets.precompile += %w[ d3-chord.js ]
Rails.application.config.assets.precompile += %w[ d3-color.js ]
Rails.application.config.assets.precompile += %w[ d3-contour.js ]
Rails.application.config.assets.precompile += %w[ d3-delaunay.js ]
Rails.application.config.assets.precompile += %w[ d3-dispatch.js ]
Rails.application.config.assets.precompile += %w[ d3-drag.js ]
Rails.application.config.assets.precompile += %w[ d3-dsv.js ]
Rails.application.config.assets.precompile += %w[ d3-ease.js ]
Rails.application.config.assets.precompile += %w[ d3-fetch.js ]
Rails.application.config.assets.precompile += %w[ d3-force.js ]
Rails.application.config.assets.precompile += %w[ d3-format.js ]
Rails.application.config.assets.precompile += %w[ d3-geo.js ]
Rails.application.config.assets.precompile += %w[ d3-hierarchy.js ]
Rails.application.config.assets.precompile += %w[ d3-interpolate.js ]
Rails.application.config.assets.precompile += %w[ d3-path.js ]
Rails.application.config.assets.precompile += %w[ d3-polygon.js ]
Rails.application.config.assets.precompile += %w[ d3-quadtree.js ]
Rails.application.config.assets.precompile += %w[ d3-random.js ]
Rails.application.config.assets.precompile += %w[ d3-scale.js ]
Rails.application.config.assets.precompile += %w[ d3-scale-chromatic.js ]
Rails.application.config.assets.precompile += %w[ d3-selection.js ]
Rails.application.config.assets.precompile += %w[ d3-shape.js ]
Rails.application.config.assets.precompile += %w[ d3-time.js ]
Rails.application.config.assets.precompile += %w[ d3-time-format.js ]
Rails.application.config.assets.precompile += %w[ d3-timer.js ]
Rails.application.config.assets.precompile += %w[ d3-transition.js ]
Rails.application.config.assets.precompile += %w[ d3-zoom.js ]
Rails.application.config.assets.precompile += %w[ delaunator.js ]
Rails.application.config.assets.precompile += %w[ internmap.js ]
Rails.application.config.assets.precompile += %w[ robust-predicates.js ]
Rails.application.config.assets.precompile += %w[ controllers/heatmap_controller.js ]
Rails.application.config.assets.precompile += %w[ controllers/barchart_controller.js ]
