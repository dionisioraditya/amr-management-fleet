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
        Schema::create('maps', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index();
            $table->string('image_path');
            $table->decimal('resolution', 8, 4)->default(0.0500); // meters per pixel
            $table->decimal('origin_x', 10, 4)->default(0.0000);
            $table->decimal('origin_y', 10, 4)->default(0.0000);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maps');
    }
};
