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
        Schema::create('keepout_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('map_id')->constrained('maps')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('type', 30)->default('keep_out'); // keep_out | speed_limit | caution
            $table->json('coordinates'); // Array of metric vertices [{"x": float, "y": float}, ...]
            $table->decimal('speed_limit', 5, 2)->nullable(); // m/s cap for speed_limit zones
            $table->boolean('is_active')->default(true);
            $table->string('color', 20)->default('#dc2626');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['map_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('keepout_zones');
    }
};
