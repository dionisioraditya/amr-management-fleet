<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('maps', function (Blueprint $table) {
            $table->integer('width_px')->nullable()->after('image_path');
            $table->integer('height_px')->nullable()->after('width_px');
            $table->decimal('origin_yaw', 8, 4)->default(0.0000)->after('origin_y');
            $table->decimal('occupied_thresh', 5, 2)->default(0.65)->after('origin_yaw');
            $table->decimal('free_thresh', 5, 2)->default(0.25)->after('occupied_thresh');
            $table->boolean('negate')->default(false)->after('free_thresh');
            $table->string('raw_pgm_path')->nullable()->after('negate');
            $table->string('raw_yaml_path')->nullable()->after('raw_pgm_path');
            $table->string('keepout_path')->nullable()->after('raw_yaml_path');
            $table->string('posegraph_path')->nullable()->after('keepout_path');
            $table->string('data_path')->nullable()->after('posegraph_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maps', function (Blueprint $table) {
            $table->dropColumn([
                'width_px',
                'height_px',
                'origin_yaw',
                'occupied_thresh',
                'free_thresh',
                'negate',
                'raw_pgm_path',
                'raw_yaml_path',
                'keepout_path',
                'posegraph_path',
                'data_path',
            ]);
        });
    }
};
