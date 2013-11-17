/*jshint node:true*/
module.exports = function (grunt) {
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-browserify");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-jshint");

	grunt.initConfig({
		browserify: {
			libs: {
				src: ["js/libs/**/*.js"],
				dest: "js/libs-bundle.js",
				options: {
					alias: [
						"js/libs/d3/d3Quadtree.js:d3Quadtree",
						"js/libs/glow/GlowCore.js:GlowCore",
						"js/libs/glow/GlowFloat.js:GlowFloat",
						"js/libs/glow/GlowPlaneGeometry.js:GlowPlaneGeometry"
					]
				}
			},
			main: {
				src: ["js/src/main.js"],
				dest: "js/main-bundle.js",
				options: {
					external: [
						"d3Quadtree",
						"GlowCore",
						"GlowFloat",
						"GlowPlaneGeometry"
					],
					transform: ["brfs"]
				}
			}
		},

		uglify: {
			main: {
				src: ["js/main-bundle.js"],
				dest: "js/main-bundle.js"
			}
		},

		jshint: {
			all: {
				options: { jshintrc: true },
				files: { src: ["js/src/**/*.js"] }
			}
		},

		watch: {
			scripts: {
				files: ["js/**/*"],
				tasks: ["browserify"],
				options: {
					spawn: false,
				}
			}
		}
	});

	grunt.registerTask("build", ["jshint", "browserify", "uglify"]);
	grunt.registerTask("default", "watch");
};
